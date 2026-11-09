package com.campusconnect.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "auth_otp_challenges", indexes = {
        @Index(name = "idx_auth_otp_email_purpose", columnList = "email,purpose")
})
@Data
@NoArgsConstructor
public class AuthOtpChallenge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(nullable = false, length = 20)
    private String purpose;

    @Column(nullable = false, length = 64)
    private String otpHash;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime windowStartedAt;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private int attempts;

    @Column(nullable = false)
    private int sendCount;

    private String name;
    private String rollNumber;
    private LocalDate dateOfBirth;
    private String mobileNumber;

    @Column(length = 10)
    private String gender;

    @Column(length = 30)
    private String hostel;

    @Column(length = 100)
    private String passwordHash;
}
