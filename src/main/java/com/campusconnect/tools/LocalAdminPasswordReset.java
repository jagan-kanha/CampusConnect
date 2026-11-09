package com.campusconnect.tools;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import javax.swing.*;
import java.awt.*;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.Arrays;

/**
 * Local development helper. Run manually from the IDE; this is not a web endpoint.
 */
public final class LocalAdminPasswordReset {

    private LocalAdminPasswordReset() {
    }

    public static void main(String[] args) {
        String email = JOptionPane.showInputDialog(
                null,
                "Email address of the ADMIN account:",
                "Reset local admin password",
                JOptionPane.QUESTION_MESSAGE
        );

        if (email == null || email.isBlank()) {
            return;
        }

        JPasswordField newPasswordField = new JPasswordField(22);
        JPasswordField confirmPasswordField = new JPasswordField(22);
        JPanel panel = new JPanel(new GridLayout(0, 1, 0, 6));
        panel.add(new JLabel("New password (at least 6 characters):"));
        panel.add(newPasswordField);
        panel.add(new JLabel("Confirm new password:"));
        panel.add(confirmPasswordField);

        int choice = JOptionPane.showConfirmDialog(
                null,
                panel,
                "Choose a new admin password",
                JOptionPane.OK_CANCEL_OPTION,
                JOptionPane.PLAIN_MESSAGE
        );
        if (choice != JOptionPane.OK_OPTION) {
            clear(newPasswordField, confirmPasswordField);
            return;
        }

        char[] password = newPasswordField.getPassword();
        char[] confirmation = confirmPasswordField.getPassword();
        clear(newPasswordField, confirmPasswordField);

        if (password.length < 6 || !Arrays.equals(password, confirmation)) {
            clear(password, confirmation);
            JOptionPane.showMessageDialog(
                    null,
                    "The passwords must match and contain at least 6 characters.",
                    "Password not changed",
                    JOptionPane.ERROR_MESSAGE
            );
            return;
        }

        try {
            String databasePassword = System.getenv("DB_PASSWORD");
            if (databasePassword == null || databasePassword.isBlank()) {
                throw new IllegalStateException("DB_PASSWORD is not set for this run configuration.");
            }

            String databaseUrl = System.getenv("DB_URL");
            if (databaseUrl == null || databaseUrl.isBlank()) {
                databaseUrl = "jdbc:mysql://localhost:3306/campusconnect";
            }
            String databaseUser = System.getenv("DB_USERNAME");
            if (databaseUser == null || databaseUser.isBlank()) {
                databaseUser = "root";
            }
            String encodedPassword = new BCryptPasswordEncoder().encode(new String(password));

            try (Connection connection = DriverManager.getConnection(databaseUrl, databaseUser, databasePassword);
                 PreparedStatement checkAccount = connection.prepareStatement(
                         "SELECT role FROM users WHERE email = ?")) {
                checkAccount.setString(1, email.trim());
                try (ResultSet result = checkAccount.executeQuery()) {
                    if (!result.next()) {
                        throw new IllegalArgumentException("No account exists for that email.");
                    }
                    if (!"ADMIN".equals(result.getString("role"))) {
                        throw new IllegalArgumentException("That account is not assigned the ADMIN role.");
                    }
                }

                try (PreparedStatement updatePassword = connection.prepareStatement(
                        "UPDATE users SET password = ? WHERE email = ? AND role = 'ADMIN'")) {
                    updatePassword.setString(1, encodedPassword);
                    updatePassword.setString(2, email.trim());
                    if (updatePassword.executeUpdate() != 1) {
                        throw new IllegalStateException("The admin password was not updated.");
                    }
                }
            }
            JOptionPane.showMessageDialog(
                    null,
                    "The admin password was reset. Sign in with the new password.",
                    "Password reset",
                    JOptionPane.INFORMATION_MESSAGE
            );
        } catch (Exception exception) {
            String detail = exception instanceof IllegalArgumentException
                    || exception instanceof IllegalStateException
                    ? exception.getMessage()
                    : "Check that MySQL is running and DB_PASSWORD is correct.";
            JOptionPane.showMessageDialog(
                    null,
                    "Password was not changed.\n\n" + detail,
                    "Reset failed",
                    JOptionPane.ERROR_MESSAGE
            );
        } finally {
            clear(password, confirmation);
        }
    }

    private static void clear(JPasswordField... fields) {
        for (JPasswordField field : fields) {
            char[] value = field.getPassword();
            clear(value);
            field.setText("");
        }
    }

    private static void clear(char[]... values) {
        for (char[] value : values) {
            Arrays.fill(value, '\0');
        }
    }
}
