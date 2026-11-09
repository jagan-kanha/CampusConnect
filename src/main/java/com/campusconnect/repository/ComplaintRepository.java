package com.campusconnect.repository;

import com.campusconnect.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ComplaintRepository
        extends JpaRepository<Complaint, Long>, JpaSpecificationExecutor<Complaint> {

    Page<Complaint> findByUserId(Long userId, Pageable pageable);

    Page<Complaint> findByStatusIn(java.util.Collection<ComplaintStatus> statuses, Pageable pageable);

    long countByUserId(Long userId);

    Page<Complaint> findByStatus(
            ComplaintStatus status,
            Pageable pageable);

    Page<Complaint> findByPriority(
            ComplaintPriority priority,
            Pageable pageable);

    Page<Complaint> findByCategory(
            ComplaintCategory category,
            Pageable pageable);
}
