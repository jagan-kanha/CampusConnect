package com.campusconnect.service;

import com.campusconnect.dto.ComplaintRequest;
import com.campusconnect.entity.Complaint;
import com.campusconnect.entity.ComplaintStatus;
import com.campusconnect.entity.User;
import com.campusconnect.repository.ComplaintRepository;
import com.campusconnect.repository.UserRepository;
import org.springframework.stereotype.Service;
import com.campusconnect.entity.ComplaintCategory;
import com.campusconnect.entity.ComplaintPriority;
import com.campusconnect.entity.ComplaintStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.campusconnect.exception.ResourceNotFoundException;

import java.util.List;

@Service
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;

    public ComplaintService(
            ComplaintRepository complaintRepository,
            UserRepository userRepository) {

        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
    }

    public Complaint createComplaint(
            ComplaintRequest request,
            String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        Complaint complaint = new Complaint();

        complaint.setTitle(request.getTitle());
        complaint.setDescription(request.getDescription());
        complaint.setCategory(request.getCategory());
        complaint.setPriority(request.getPriority());
        complaint.setUser(user);

        return complaintRepository.save(complaint);
    }

    public Page<Complaint> getMyComplaints(
            String email,
            Pageable pageable) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Complaint not found"));

        return complaintRepository.findByUserId(
                user.getId(),
                pageable
        );
    }
    public Page<Complaint> getAllComplaints(
            ComplaintStatus status,
            ComplaintPriority priority,
            ComplaintCategory category,
            Pageable pageable) {

        if (status != null) {
            return complaintRepository.findByStatus(
                    status,
                    pageable
            );
        }

        if (priority != null) {
            return complaintRepository.findByPriority(
                    priority,
                    pageable
            );
        }

        if (category != null) {
            return complaintRepository.findByCategory(
                    category,
                    pageable
            );
        }

        return complaintRepository.findAll(pageable);
    }

    public Complaint updateStatus(
            Long complaintId,
            ComplaintStatus status) {

        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() ->
                        new RuntimeException("Complaint not found"));

        complaint.setStatus(status);

        return complaintRepository.save(complaint);
    }
}