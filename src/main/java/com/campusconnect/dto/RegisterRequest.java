package com.campusconnect.dto;


import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import com.campusconnect.entity.StudentGender;

import java.time.LocalDate;

@Data
public class RegisterRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Roll number is required")
    @Pattern(regexp = "^[0-9]{3}[A-Za-z]{2}[0-9]{4}$", message = "Roll number must look like 124BT0021")
    private String rollNumber;

    @NotNull(message = "Date of birth is required")
    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    @NotBlank(message = "Mobile number is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Mobile number must contain exactly 10 digits")
    private String mobileNumber;

    @NotNull(message = "Select male or female")
    private StudentGender gender;

    @NotBlank(message = "Select your current hostel")
    @Pattern(regexp = "^(DBA Hall|GDB Hall|MSS Hall|MV Hall|SD Hall|VS Hall|HB Hall|KMS Hall|CVR Hall)$", message = "Select a hostel from the list")
    private String hostel;

    @Email(message = "Enter a valid college email")
    @Pattern(regexp = "^[A-Za-z0-9._%+-]+@nitrkl\\.ac\\.in$", flags = Pattern.Flag.CASE_INSENSITIVE, message = "Use your @nitrkl.ac.in email address")
    @NotBlank(message = "Email is required")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must contain at least 6 characters")
    private String password;
}
