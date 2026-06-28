package com.dms.alert;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {
    Page<Alert> findByStatus(String status, Pageable pageable);
    List<Alert> findByStatusOrderByCreatedAtDesc(String status);
    Page<Alert> findBySeverity(String severity, Pageable pageable);
}
