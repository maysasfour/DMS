package com.dms.resource;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, Long> {
    Page<Resource> findByType(String type, Pageable pageable);
    Page<Resource> findByStatus(String status, Pageable pageable);
    Page<Resource> findByTypeAndStatus(String type, String status, Pageable pageable);
    List<Resource> findByStatus(String status);
    long countByStatus(String status);
}
