package com.campusconnect.controller;

import com.campusconnect.dto.ComplaintRequest;
import com.campusconnect.dto.ComplaintResponse;
import com.campusconnect.dto.CampusComplaintResponse;
import com.campusconnect.dto.ComplaintSupportResponse;
import com.campusconnect.entity.Complaint;
import com.campusconnect.service.ComplaintService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
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

    @GetMapping("/campus")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Page<CampusComplaintResponse>> getCampusComplaints(
            Authentication authentication,
            Pageable pageable) {
        return ResponseEntity.ok(
                complaintService.getCampusComplaints(authentication.getName(), pageable)
        );
    }

    @PostMapping("/{id}/support")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ComplaintSupportResponse> supportComplaint(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(
                complaintService.supportComplaint(id, authentication.getName())
        );
    }

    @DeleteMapping("/{id}/support")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ComplaintSupportResponse> removeSupport(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(
                complaintService.removeSupport(id, authentication.getName())
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
                complaint.getUser().getId(),
                complaint.getUser().getName(),
                complaint.getUser().getEmail(),
                complaintService.getSupportCount(complaint.getId())
        );
    }
}
