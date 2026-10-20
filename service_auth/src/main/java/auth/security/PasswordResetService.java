package auth.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import auth.entity.UserEntity;
import auth.exception.AuthException;
import auth.repository.UserRepository;

import java.security.SecureRandom;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final String CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final int PASSWORD_LENGTH = 12;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    @Transactional
    public void resetPassword(String email) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AuthException("User not found"));

        String newPassword = generateRandomPassword();

        String hash = passwordEncoder.encode(newPassword);
        userRepository.updatePassword(user.getId(), hash);

        log.info("PASSWORD RESET SUCCESS for user: {}", email);
        log.info("New password: {}", newPassword);

        System.out.println("PASSWORD RESET SUCCESS for user: " + email);
        System.out.println("New password: " + newPassword);
    }

    private String generateRandomPassword() {
        StringBuilder sb = new StringBuilder(PASSWORD_LENGTH);
        for (int i = 0; i < PASSWORD_LENGTH; i++) {
            sb.append(CHARS.charAt(random.nextInt(CHARS.length())));
        }
        return sb.toString();
    }
}