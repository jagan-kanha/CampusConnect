package com.campusconnect.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;
import com.campusconnect.entity.StudentGender;

@Data
@AllArgsConstructor
public class ProfileResponse {
    private String name;
    private String email;
    private String rollNumber;
    private LocalDate dateOfBirth;
    private String mobileNumber;
    private StudentGender gender;
    private String hostel;
    private long totalComplaints;
}
