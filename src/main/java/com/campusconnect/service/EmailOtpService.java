package com.campusconnect.service;

import com.campusconnect.dto.PasswordResetRequest;
import com.campusconnect.dto.RegisterRequest;
import com.campusconnect.entity.AuthOtpChallenge;
import com.campusconnect.entity.Role;
import com.campusconnect.entity.StudentGender;
import com.campusconnect.entity.User;
import com.campusconnect.exception.BadRequestException;
import com.campusconnect.repository.AuthOtpChallengeRepository;
import com.campusconnect.repository.UserRepository;
import com.campusconnect.util.HostelEligibility;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class EmailOtpService {

    private static final String REGISTRATION = "REGISTRATION";
    private static final String PASSWORD_RESET = "PASSWORD_RESET";
    private static final int MAX_ATTEMPTS = 5;
    private static final int MAX_SENDS_PER_HOUR = 5;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final AuthOtpChallengeRepository challengeRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RestClient restClient;
    private final String brevoApiKey;
    private final String senderEmail;
    private final String jwtSecret;

    public EmailOtpService(
            AuthOtpChallengeRepository challengeRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            RestClient.Builder restClientBuilder,
            @Value("${BREVO_API_KEY:}") String brevoApiKey,
            @Value("${BREVO_SENDER_EMAIL:}") String senderEmail,
            @Value("${jwt.secret}") String jwtSecret) {
        this.challengeRepository = challengeRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.restClient = restClientBuilder.build();
        this.brevoApiKey = brevoApiKey;
        this.senderEmail = senderEmail;
        this.jwtSecret = jwtSecret;
    }

    public void requestRegistrationOtp(RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        String rollNumber = request.getRollNumber().trim().toLowerCase(Locale.ROOT);
        if (!email.equals(rollNumber + "@nitrkl.ac.in")) {
            throw new BadRequestException("Your college email must match your roll number (example: 124BT0021@nitrkl.ac.in)");
        }
        if (!HostelEligibility.isValid(request.getGender(), request.getHostel())) {
            throw new BadRequestException("Choose a hostel for the selected gender");
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BadRequestException("An account with this email already exists");
        }
        AuthOtpChallenge challenge = prepareChallenge(email, REGISTRATION);
        challenge.setName(request.getName().trim());
        challenge.setRollNumber(request.getRollNumber().trim().toUpperCase());
        challenge.setDateOfBirth(request.getDateOfBirth());
        challenge.setMobileNumber(request.getMobileNumber().trim());
        challenge.setGender(request.getGender().name());
        challenge.setHostel(request.getHostel());
        challenge.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        issueAndSend(challenge);
    }

    public void verifyRegistrationOtp(String emailValue, String code) {
        String email = emailValue.trim().toLowerCase(Locale.ROOT);
        AuthOtpChallenge challenge = requireValidCode(email, REGISTRATION, code);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            challengeRepository.delete(challenge);
            throw new BadRequestException("An account with this email already exists");
        }
        User user = new User();
        user.setName(challenge.getName());
        user.setEmail(challenge.getEmail());
        user.setRollNumber(challenge.getRollNumber());
        user.setDateOfBirth(challenge.getDateOfBirth());
        user.setMobileNumber(challenge.getMobileNumber());
        user.setGender(StudentGender.valueOf(challenge.getGender()));
        user.setHostel(challenge.getHostel());
        user.setPassword(challenge.getPasswordHash());
        user.setRole(Role.STUDENT);
        userRepository.save(user);
        challengeRepository.delete(challenge);
    }

    public void requestPasswordResetOtp(String emailValue) {
        String email = emailValue.trim().toLowerCase(Locale.ROOT);
        challengeRepository.deleteByExpiresAtBefore(LocalDateTime.now());
        userRepository.findByEmailIgnoreCase(email).ifPresent(user -> {
            AuthOtpChallenge challenge = prepareChallenge(email, PASSWORD_RESET);
            issueAndSend(challenge);
        });
    }

    public void resetPassword(PasswordResetRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        AuthOtpChallenge challenge = requireValidCode(email, PASSWORD_RESET, request.getCode());
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadRequestException("The reset request is invalid or expired"));
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        challengeRepository.delete(challenge);
    }

    public void resendRegistrationOtp(String emailValue) {
        String email = emailValue.trim().toLowerCase(Locale.ROOT);
        AuthOtpChallenge challenge = challengeRepository
                .findTopByEmailAndPurposeOrderByCreatedAtDesc(email, REGISTRATION)
                .orElseThrow(() -> new BadRequestException("Start registration again to request a new code"));
        LocalDateTime now = LocalDateTime.now();
        if (challenge.getCreatedAt().isAfter(now.minusSeconds(60))) {
            throw new BadRequestException("Wait 60 seconds before requesting another code");
        }
        if (challenge.getWindowStartedAt().isBefore(now.minusHours(1))) {
            challenge.setWindowStartedAt(now);
            challenge.setSendCount(0);
        }
        if (challenge.getSendCount() >= MAX_SENDS_PER_HOUR) {
            throw new BadRequestException("Too many codes requested. Try again in an hour");
        }
        challenge.setSendCount(challenge.getSendCount() + 1);
        challenge.setCreatedAt(now);
        challenge.setExpiresAt(now.plusMinutes(10));
        challenge.setAttempts(0);
        issueAndSend(challenge);
    }

    private AuthOtpChallenge prepareChallenge(String email, String purpose) {
        LocalDateTime now = LocalDateTime.now();
        challengeRepository.deleteByExpiresAtBefore(now);
        AuthOtpChallenge challenge = challengeRepository
                .findTopByEmailAndPurposeOrderByCreatedAtDesc(email, purpose)
                .orElseGet(AuthOtpChallenge::new);

        if (challenge.getCreatedAt() != null && challenge.getCreatedAt().isAfter(now.minusSeconds(60))) {
            throw new BadRequestException("Wait 60 seconds before requesting another code");
        }
        if (challenge.getWindowStartedAt() == null || challenge.getWindowStartedAt().isBefore(now.minusHours(1))) {
            challenge.setWindowStartedAt(now);
            challenge.setSendCount(0);
        }
        if (challenge.getSendCount() >= MAX_SENDS_PER_HOUR) {
            throw new BadRequestException("Too many codes requested. Try again in an hour");
        }
        challenge.setEmail(email);
        challenge.setPurpose(purpose);
        challenge.setAttempts(0);
        challenge.setSendCount(challenge.getSendCount() + 1);
        challenge.setCreatedAt(now);
        challenge.setExpiresAt(now.plusMinutes(10));
        return challenge;
    }

    private void issueAndSend(AuthOtpChallenge challenge) {
        String code = generateCode();
        challenge.setOtpHash(hashCode(challenge.getEmail(), challenge.getPurpose(), code));
        challengeRepository.save(challenge);
        try {
            sendEmail(challenge.getEmail(), code, challenge.getPurpose());
        } catch (RuntimeException exception) {
            challengeRepository.delete(challenge);
            if (exception instanceof BadRequestException badRequestException) throw badRequestException;
            throw new BadRequestException("Could not send the verification email. Check the email service configuration");
        }
    }

    private void sendEmail(String email, String code, String purpose) {
        if (brevoApiKey == null || brevoApiKey.isBlank()
                || senderEmail == null || senderEmail.isBlank()) {
            throw new BadRequestException("Email delivery is not configured yet");
        }
        String subject = purpose.equals(REGISTRATION)
                ? "CampusConnect account verification"
                : "CampusConnect password reset";
        String text = "Your CampusConnect verification code is " + code
                + ". It expires in 10 minutes. If you did not request this code, ignore this email.";
        restClient.post()
                .uri("https://api.brevo.com/v3/smtp/email")
                .header("api-key", brevoApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(java.util.Map.of(
                        "sender", java.util.Map.of("name", "CampusConnect", "email", senderEmail),
                        "to", java.util.List.of(java.util.Map.of("email", email)),
                        "subject", subject,
                        "textContent", text
                ))
                .retrieve()
                .toBodilessEntity();
    }

    private AuthOtpChallenge requireValidCode(String email, String purpose, String code) {
        AuthOtpChallenge challenge = challengeRepository
                .findTopByEmailAndPurposeOrderByCreatedAtDesc(email, purpose)
                .orElseThrow(() -> new BadRequestException("The code is invalid or expired"));
        if (challenge.getExpiresAt().isBefore(LocalDateTime.now())) {
            challengeRepository.delete(challenge);
            throw new BadRequestException("The code is invalid or expired");
        }
        if (challenge.getAttempts() >= MAX_ATTEMPTS) {
            challengeRepository.delete(challenge);
            throw new BadRequestException("Too many attempts. Request a new code");
        }
        String suppliedHash = hashCode(email, purpose, code);
        if (!MessageDigest.isEqual(
                challenge.getOtpHash().getBytes(StandardCharsets.UTF_8),
                suppliedHash.getBytes(StandardCharsets.UTF_8))) {
            challenge.setAttempts(challenge.getAttempts() + 1);
            challengeRepository.save(challenge);
            throw new BadRequestException("The code is invalid or expired");
        }
        return challenge;
    }

    private String generateCode() {
        return "%06d".formatted(RANDOM.nextInt(1_000_000));
    }

    private String hashCode(String email, String purpose, String code) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal((email + ":" + purpose + ":" + code).getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (java.security.GeneralSecurityException exception) {
            throw new IllegalStateException("Could not validate verification code", exception);
        }
    }
}
