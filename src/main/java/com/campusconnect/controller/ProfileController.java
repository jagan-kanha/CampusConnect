package com.campusconnect.controller;

import com.campusconnect.dto.ProfileResponse;
import com.campusconnect.dto.ProfileUpdateRequest;
import com.campusconnect.entity.User;
import com.campusconnect.exception.BadRequestException;
import com.campusconnect.exception.ResourceNotFoundException;
import com.campusconnect.repository.ComplaintRepository;
import com.campusconnect.repository.UserRepository;
import com.campusconnect.util.HostelEligibility;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserRepository userRepository;
    private final ComplaintRepository complaintRepository;

    public ProfileController(UserRepository userRepository, ComplaintRepository complaintRepository) {
        this.userRepository = userRepository;
        this.complaintRepository = complaintRepository;
    }

    @GetMapping
    public ResponseEntity<ProfileResponse> getProfile(Authentication authentication) {
        User user = findUser(authentication.getName());
        return ResponseEntity.ok(toResponse(user));
    }

    @PutMapping
    public ResponseEntity<ProfileResponse> updateProfile(
            @Valid @RequestBody ProfileUpdateRequest request,
            Authentication authentication) {
        User user = findUser(authentication.getName());
        if (!HostelEligibility.isValid(request.getGender(), request.getHostel())) {
            throw new BadRequestException("Choose a hostel for the selected gender");
        }
        String requestedRollNumber = clean(request.getRollNumber());
        String currentRollNumber = clean(user.getRollNumber());
        if (currentRollNumber == null
                ? requestedRollNumber != null
                : requestedRollNumber == null || !currentRollNumber.equalsIgnoreCase(requestedRollNumber)) {
            throw new BadRequestException("Roll number cannot be changed after registration");
        }
        user.setName(request.getName().trim());
        user.setDateOfBirth(request.getDateOfBirth());
        user.setMobileNumber(clean(request.getMobileNumber()));
        user.setGender(request.getGender());
        user.setHostel(request.getHostel());
        return ResponseEntity.ok(toResponse(userRepository.save(user)));
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private ProfileResponse toResponse(User user) {
        return new ProfileResponse(
                user.getName(), user.getEmail(), user.getRollNumber(), user.getDateOfBirth(),
                user.getMobileNumber(), user.getGender(), user.getHostel(),
                complaintRepository.countByUserId(user.getId())
        );
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
