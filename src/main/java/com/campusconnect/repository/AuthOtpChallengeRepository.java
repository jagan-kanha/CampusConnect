package com.campusconnect.repository;

import com.campusconnect.entity.AuthOtpChallenge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface AuthOtpChallengeRepository extends JpaRepository<AuthOtpChallenge, Long> {

    Optional<AuthOtpChallenge> findTopByEmailAndPurposeOrderByCreatedAtDesc(String email, String purpose);

    void deleteByEmailAndPurpose(String email, String purpose);

    void deleteByExpiresAtBefore(LocalDateTime expiry);
}
