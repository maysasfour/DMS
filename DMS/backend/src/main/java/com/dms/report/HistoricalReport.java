package com.dms.report;

import com.dms.admin.Admin;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "historical_reports")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class HistoricalReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    private Long reportId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @CreationTimestamp
    @Column(name = "generated_at", nullable = false, updatable = false)
    private LocalDateTime generatedAt;

    @Column(name = "file_link")
    private String fileLink;

    @Column(name = "total_incidents", nullable = false)
    @Builder.Default
    private Integer totalIncidents = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id")
    private Admin admin;
}
