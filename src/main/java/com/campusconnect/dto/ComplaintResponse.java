package com.campusconnect.dto;

import com.campusconnect.entity.ComplaintCategory;
import com.campusconnect.entity.ComplaintPriority;
import com.campusconnect.entity.ComplaintStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class ComplaintResponse {

    private Long id;
    private String title;
    private String description;
    private ComplaintCategory category;
    private ComplaintPriority priority;
    private ComplaintStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long userId;
    private String studentName;
    private String studentEmail;
}
