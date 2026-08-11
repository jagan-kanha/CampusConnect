package com.campusconnect.controller;

import com.campusconnect.dto.ComplaintRequest;
import com.campusconnect.dto.ComplaintResponse;
import com.campusconnect.entity.Complaint;
import com.campusconnect.service.ComplaintService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Pageable;


import java.util.List;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    private final ComplaintService complaintService;

    public ComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    @PostMapping
    public ResponseEntity<ComplaintResponse> createComplaint(
            @Valid @RequestBody ComplaintRequest request,
            Authentication authentication) {

        String email = authentication.getName();

        Complaint complaint =
                complaintService.createComplaint(request, email);

        return ResponseEntity.ok(
                toResponse(complaint)
        );
    }

    @GetMapping("/my")
    public ResponseEntity<Page<ComplaintResponse>> getMyComplaints(
            Authentication authentication,
            Pageable pageable) {

        String email = authentication.getName();

        Page<Complaint> complaints =
                complaintService.getMyComplaints(
                        email,
                        pageable
                );

        return ResponseEntity.ok(
                complaints.map(this::toResponse)
        );
    }

    private ComplaintResponse toResponse(Complaint complaint) {

        return new ComplaintResponse(
                complaint.getId(),
                complaint.getTitle(),
                complaint.getDescription(),
                complaint.getCategory(),
                complaint.getPriority(),
                complaint.getStatus(),
                complaint.getCreatedAt(),
                complaint.getUpdatedAt(),
                complaint.getUser().getId()
        );
    }
}