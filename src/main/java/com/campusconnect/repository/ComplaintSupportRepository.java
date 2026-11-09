package com.campusconnect.repository;

import com.campusconnect.entity.ComplaintSupport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplaintSupportRepository extends JpaRepository<ComplaintSupport, Long> {

    boolean existsByComplaint_IdAndUser_Id(Long complaintId, Long userId);

    long countByComplaint_Id(Long complaintId);

    long deleteByComplaint_IdAndUser_Id(Long complaintId, Long userId);
}
