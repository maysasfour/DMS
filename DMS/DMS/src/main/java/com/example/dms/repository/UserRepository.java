package com.example.dms.repository;

import com.example.dms.model.RoleName;
import com.example.dms.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserRepository extends JpaRepository<User, Long> {
	@Query("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:email)")
	Optional<User> findByEmailIgnoreCase(@Param("email") String email);

	@Query("SELECT COUNT(u) > 0 FROM User u WHERE LOWER(u.email) = LOWER(:email)")
	boolean existsByEmailIgnoreCase(@Param("email") String email);

	List<User> findByRole_NameIn(List<RoleName> roles);

	Page<User> findByRole_Name(RoleName role, Pageable pageable);
}

