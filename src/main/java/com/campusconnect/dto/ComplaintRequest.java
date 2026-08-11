package com.campusconnect.dto;

import com.campusconnect.entity.ComplaintCategory;
import com.campusconnect.entity.ComplaintPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ComplaintRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Category is required")
    private ComplaintCategory category;

    @NotNull(message = "Priority is required")
    private ComplaintPriority priority;
}