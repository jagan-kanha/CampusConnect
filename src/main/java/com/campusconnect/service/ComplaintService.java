package com.campusconnect.service;

import com.campusconnect.dto.ComplaintRequest;
import com.campusconnect.dto.CampusComplaintResponse;
import com.campusconnect.dto.ComplaintSupportResponse;
import com.campusconnect.entity.ComplaintCategory;
import com.campusconnect.entity.ComplaintPriority;
import com.campusconnect.entity.Complaint;
import com.campusconnect.entity.ComplaintSupport;
import com.campusconnect.entity.ComplaintStatus;
import com.campusconnect.entity.User;
import com.campusconnect.exception.BadRequestException;
import com.campusconnect.repository.ComplaintRepository;
import com.campusconnect.repository.ComplaintSupportRepository;
import com.campusconnect.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import com.campusconnect.exception.ResourceNotFoundException;

import java.util.ArrayList;
import java.util.List;

@Service
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final ComplaintSupportRepository supportRepository;
    private final UserRepository userRepository;

    public ComplaintService(
            ComplaintRepository complaintRepository,
            ComplaintSupportRepository supportRepository,
            UserRepository userRepository) {

        this.complaintRepository = complaintRepository;
        this.supportRepository = supportRepository;
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

    public Page<CampusComplaintResponse> getCampusComplaints(String email, Pageable pageable) {
        User user = findUser(email);
        return complaintRepository.findByStatusIn(
                        List.of(ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS), pageable)
                .map(complaint -> toCampusResponse(complaint, user));
    }

    @Transactional
    public ComplaintSupportResponse supportComplaint(Long complaintId, String email) {
        User user = findUser(email);
        Complaint complaint = findComplaint(complaintId);
        ensureSupportable(complaint, user);
        if (!supportRepository.existsByComplaint_IdAndUser_Id(complaintId, user.getId())) {
            supportRepository.save(new ComplaintSupport(complaint, user));
        }
        return getSupportState(complaintId, user.getId());
    }

    @Transactional
    public ComplaintSupportResponse removeSupport(Long complaintId, String email) {
        User user = findUser(email);
        Complaint complaint = findComplaint(complaintId);
        if (complaint.getUser().getId().equals(user.getId())) {
            throw new BadRequestException("You cannot support your own complaint");
        }
        supportRepository.deleteByComplaint_IdAndUser_Id(complaintId, user.getId());
        return getSupportState(complaintId, user.getId());
    }

    public long getSupportCount(Long complaintId) {
        return supportRepository.countByComplaint_Id(complaintId);
    }

    private CampusComplaintResponse toCampusResponse(Complaint complaint, User currentUser) {
        boolean ownComplaint = complaint.getUser().getId().equals(currentUser.getId());
        boolean supportedByMe = !ownComplaint && supportRepository
                .existsByComplaint_IdAndUser_Id(complaint.getId(), currentUser.getId());
        return new CampusComplaintResponse(
                complaint.getId(), complaint.getTitle(), complaint.getDescription(),
                complaint.getCategory(), complaint.getPriority(), complaint.getStatus(),
                complaint.getCreatedAt(), supportRepository.countByComplaint_Id(complaint.getId()),
                supportedByMe, ownComplaint
        );
    }

    private ComplaintSupportResponse getSupportState(Long complaintId, Long userId) {
        return new ComplaintSupportResponse(
                supportRepository.countByComplaint_Id(complaintId),
                supportRepository.existsByComplaint_IdAndUser_Id(complaintId, userId)
        );
    }

    private void ensureSupportable(Complaint complaint, User user) {
        if (complaint.getUser().getId().equals(user.getId())) {
            throw new BadRequestException("You cannot support your own complaint");
        }
        if (complaint.getStatus() != ComplaintStatus.OPEN
                && complaint.getStatus() != ComplaintStatus.IN_PROGRESS) {
            throw new BadRequestException("Only open or in-progress complaints can receive support");
        }
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Complaint findComplaint(Long complaintId) {
        return complaintRepository.findById(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found"));
    }
    public Page<Complaint> getAllComplaints(
            ComplaintStatus status,
            ComplaintPriority priority,
            ComplaintCategory category,
            Pageable pageable) {

        List<Specification<Complaint>> filters = new ArrayList<>();
        if (status != null) {
            filters.add((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("status"), status));
        }
        if (priority != null) {
            filters.add((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("priority"), priority));
        }
        if (category != null) {
            filters.add((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("category"), category));
        }

        return complaintRepository.findAll(Specification.allOf(filters), pageable);
    }

    public Complaint updateStatus(
            Long complaintId,
            ComplaintStatus status) {

        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Complaint not found"));

        complaint.setStatus(status);

        return complaintRepository.save(complaint);
    }
}
