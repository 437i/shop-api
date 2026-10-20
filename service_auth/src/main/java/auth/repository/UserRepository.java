package auth.repository;

import auth.entity.UserEntity;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository {
    UserEntity save(UserEntity user);
    Optional<UserEntity> findById(UUID id);
    void updatePassword(UUID userId, String newPasswordHash);
    Optional<UserEntity> findByEmail(String email);
    boolean existsByEmail(String email);
}