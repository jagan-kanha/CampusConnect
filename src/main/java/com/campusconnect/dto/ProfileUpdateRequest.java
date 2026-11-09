package com.campusconnect.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotNull;
import com.campusconnect.entity.StudentGender;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ProfileUpdateRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 100, message = "Name must be at most 100 characters")
    private String name;

    @Pattern(regexp = "^(?:[0-9]{3}[A-Za-z]{2}[0-9]{4})?$", message = "Roll number must look like 124BT0021")
    private String rollNumber;

    private LocalDate dateOfBirth;

    @Pattern(regexp = "^(?:[0-9]{10})?$", message = "Mobile number must contain exactly 10 digits")
    private String mobileNumber;

    @NotNull(message = "Select male or female")
    private StudentGender gender;

    @NotBlank(message = "Select your current hostel")
    @Pattern(regexp = "^(DBA Hall|GDB Hall|MSS Hall|MV Hall|SD Hall|VS Hall|HB Hall|KMS Hall|CVR Hall)$", message = "Select a hostel from the list")
    private String hostel;
}
