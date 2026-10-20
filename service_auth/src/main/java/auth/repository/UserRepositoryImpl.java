package auth.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import auth.dao.UserDao;
import auth.entity.UserEntity;

import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class UserRepositoryImpl implements UserRepository {

    private final UserDao userDao;

    @Override
    public UserEntity save(UserEntity user) {
        UUID id = userDao.createUser(user);
        user.setId(id);
        return user;
    }

    @Override
    public Optional<UserEntity> findById(UUID id) {
        return userDao.findById(id);
    }

    @Override
    public void updatePassword(UUID userId, String newPasswordHash) {
        userDao.updatePassword(userId, newPasswordHash);
    }

    @Override
    public Optional<UserEntity> findByEmail(String email) {
        return userDao.findByEmail(email);
    }

    @Override
    public boolean existsByEmail(String email) {
        return userDao.existsByEmail(email);
    }
}