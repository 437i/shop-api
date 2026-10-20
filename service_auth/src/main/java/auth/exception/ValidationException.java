package auth.exception;

import io.grpc.Status;

public class ValidationException extends RuntimeException {
    private final Status.Code code;

    public ValidationException(Status.Code code, String message) {
        super(message);
        this.code = code;
    }

    public Status.Code getCode() {
        return code;
    }
}