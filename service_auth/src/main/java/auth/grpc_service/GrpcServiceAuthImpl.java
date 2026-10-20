package auth.grpc_service;

import com.google.protobuf.Empty;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.dao.DataAccessException;
import org.springframework.security.crypto.password.PasswordEncoder;
import auth.entity.UserEntity;
import auth.repository.UserRepository;
import auth.security.JwtService;
import auth.security.PasswordResetService;
import auth.exception.AuthException;
import auth.exception.ValidationException;
import auth.proto_to_grpc.*;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@GrpcService
@RequiredArgsConstructor
public class GrpcServiceAuthImpl extends AuthServiceGrpc.AuthServiceImplBase {

    private static final String EMAIL_REGEX = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.(ru|com)$";
    private static final String NAME_REGEX = "^[А-Яа-яЁёA-Za-z]+$";
    private static final String PHONE_REGEX = "^(\\+7|8)-?\\d{3}-?\\d{3}-?\\d{2}-?\\d{2}$";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final PasswordResetService passwordResetService;

    private void validate(boolean condition, String message) {
        if (!condition) {
            throw new ValidationException(Status.Code.INVALID_ARGUMENT, message);
        }
    }

    private void validateExists(boolean condition, String message) {
        if (condition) {
            throw new ValidationException(Status.Code.ALREADY_EXISTS, message);
        }
    }

    @Override
    public void register(RegisterRequest request,
                         StreamObserver<AuthResponse> responseObserver) {
        try {
            validate(!request.getEmail().isBlank(), "Email is required");
            validate(!request.getPassword().isBlank(), "Password is required");
            validate(!request.getName().isBlank(), "Name is required");
            validate(!request.getSurname().isBlank(), "Surname is required");
            validate(!request.getPhone().isBlank(), "Phone is required");

            validate(request.getEmail().matches(EMAIL_REGEX),
                    "Email must match format *@*.ru or *@*.com");
            validate(request.getEmail().length() < 50,
                    "Email must not exceed 50 characters");

            validate(request.getPassword().length() > 5,
                    "Password must be at least 5 characters");
            validate(request.getPassword().getBytes(StandardCharsets.UTF_8).length <= 72,
                    "The password is too long");

            validate(request.getName().matches(NAME_REGEX),
                    "Name must contain only letters");
            validate(request.getName().length() < 30,
                    "Name must not exceed 30 characters");

            validate(request.getSurname().matches(NAME_REGEX),
                    "Surname must contain only letters");
            validate(request.getSurname().length() < 30,
                    "Surname must not exceed 30 characters");

            validate(request.getPhone().matches(PHONE_REGEX),
                    "Phone must match format +7-XXX-XXX-XX-XX or 8-XXX-XXX-XX-XX or +7XXXXXXXXXX or 8XXXXXXXXXX");

            validateExists(userRepository.existsByEmail(request.getEmail()),
                    "Email exists");

             UserEntity user = UserEntity.builder()
             .email(request.getEmail())
             .firstName(request.getName())
             .lastName(request.getSurname())
             .phoneNumber(request.getPhone())
             .password(passwordEncoder.encode(request.getPassword()))
             .build();

            UserEntity saved = userRepository.save(user);
            String token = jwtService.generateToken(saved);

            AuthResponse response = AuthResponse.newBuilder()
                    .setToken(token)
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (ValidationException e) {
            responseObserver.onError(Status.fromCode(e.getCode())
                    .withDescription(e.getMessage())
                    .asRuntimeException());
        } catch (DataAccessException e) { // Ошибки связанные с БД
            responseObserver.onError(Status.UNAVAILABLE
                    .withDescription("Auth service temporarily unavailable")
                    .asRuntimeException());
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL // Внутренняя ошибка сервера
                    .withDescription("Registration failed: " + e.getMessage())
                    .asRuntimeException());
        }
    }

    @Override
    public void login(LoginRequest request,
                      StreamObserver<AuthResponse> responseObserver) {
        try {
            validate(!request.getEmail().isBlank(), "Email is required");
            validate(!request.getPassword().isBlank(), "Password is required");

            UserEntity user = userRepository.findByEmail(request.getEmail()).orElse(null);

            if (user == null) {
                responseObserver.onError(Status.NOT_FOUND
                        .withDescription("User not found")
                        .asRuntimeException());
                return;
            }

            if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                responseObserver.onError(Status.UNAUTHENTICATED
                        .withDescription("Invalid password")
                        .asRuntimeException());
                return;
            }

            String token = jwtService.generateToken(user);

            AuthResponse response = AuthResponse.newBuilder()
                    .setToken(token)
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (ValidationException e) {
            responseObserver.onError(Status.fromCode(e.getCode())
                    .withDescription(e.getMessage())
                    .asRuntimeException());
        } catch (DataAccessException e) {
            responseObserver.onError(Status.UNAVAILABLE
                    .withDescription("Auth service temporarily unavailable")
                    .asRuntimeException());
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL
                    .withDescription("Login failed")
                    .asRuntimeException());
        }
    }

    @Override
    public void validateToken(ValidateTokenRequest request,
                              StreamObserver<ValidateTokenResponse> responseObserver) {
        try {

            jwtService.validateToken(request.getToken());

            ValidateTokenResponse response = ValidateTokenResponse.newBuilder()
                    .setValid(true)
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (JwtException e) {
            ValidateTokenResponse response = ValidateTokenResponse.newBuilder()
                    .setValid(false)
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (Exception e) {
        responseObserver.onError(Status.INTERNAL
                .withDescription("Validate token failed: " + e.getMessage())
                .asRuntimeException());
        }
    }

    @Override
    public void changePassword(ChangePasswordRequest request,
                               StreamObserver<Empty> responseObserver) {
        try {

            validate(!request.getCurrentPassword().isBlank(), "Current password is required");
            validate(!request.getNewPassword().isBlank(), "New password are required");
            validate(request.getNewPassword().length() > 5,
                    "New password must be at least 5 characters");
            validate(request.getNewPassword().getBytes(StandardCharsets.UTF_8).length <= 72,
                    "New password is too long");

            Claims claims = jwtService.validateToken(request.getToken());

            UUID userId = UUID.fromString(claims.getSubject());

            UserEntity user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                responseObserver.onError(Status.NOT_FOUND
                        .withDescription("User not found")
                        .asRuntimeException());
                return;
            }

            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                responseObserver.onError(Status.UNAUTHENTICATED
                        .withDescription("Invalid old password")
                        .asRuntimeException());
                return;
            }

            String newPasswordHash = passwordEncoder.encode(request.getNewPassword());
            userRepository.updatePassword(user.getId(), newPasswordHash);

            responseObserver.onNext(Empty.getDefaultInstance());
            responseObserver.onCompleted();

        } catch (ValidationException e) {
            responseObserver.onError(Status.fromCode(e.getCode())
                    .withDescription(e.getMessage())
                    .asRuntimeException());
        } catch (DataAccessException e) {
            responseObserver.onError(Status.UNAVAILABLE
                    .withDescription("Auth service temporarily unavailable")
                    .asRuntimeException());
        } catch (JwtException e) {
            responseObserver.onError(Status.UNAUTHENTICATED
                    .withDescription("Invalid or expired token")
                    .asRuntimeException());
        } catch (IllegalArgumentException e) {
            responseObserver.onError(Status.INVALID_ARGUMENT
                    .withDescription("Invalid user ID in token")
                    .asRuntimeException());
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL
                    .withDescription("Change password failed"+ e.getMessage())
                    .asRuntimeException());
        }
    }

    @Override
        public void resetPassword(ResetPasswordRequest request,
                              StreamObserver<Empty> responseObserver) {
        try {

            validate(!request.getEmail().isBlank(), "Email is required");

            passwordResetService.resetPassword(request.getEmail());

            responseObserver.onNext(Empty.getDefaultInstance());
            responseObserver.onCompleted();

        } catch (ValidationException e) {
            responseObserver.onError(Status.fromCode(e.getCode())
                    .withDescription(e.getMessage())
                    .asRuntimeException());
        } catch (DataAccessException e) {
            responseObserver.onError(Status.UNAVAILABLE
                    .withDescription("Auth service temporarily unavailable")
                    .asRuntimeException());
        } catch (AuthException e) {
            responseObserver.onError(Status.NOT_FOUND
                    .withDescription(e.getMessage())
                    .asRuntimeException());
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL
                    .withDescription("Reset password failed")
                    .asRuntimeException());
        }
    }
}