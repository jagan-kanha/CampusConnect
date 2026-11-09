package com.campusconnect.util;

import com.campusconnect.entity.StudentGender;

import java.util.Set;

public final class HostelEligibility {

    private static final Set<String> BOYS_HOSTELS = Set.of(
            "DBA Hall", "GDB Hall", "MSS Hall", "MV Hall", "SD Hall", "VS Hall"
    );
    private static final Set<String> GIRLS_HOSTELS = Set.of(
            "HB Hall", "KMS Hall", "CVR Hall"
    );

    private HostelEligibility() {}

    public static boolean isValid(StudentGender gender, String hostel) {
        if (gender == null || hostel == null) return false;
        return gender == StudentGender.MALE
                ? BOYS_HOSTELS.contains(hostel)
                : GIRLS_HOSTELS.contains(hostel);
    }
}
