package campuseats.frontend;

import campuseats.backend.UserDAO;
import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;

public class LoginPage extends JFrame {
    private final JTextField userField = new JTextField();
    private final JPasswordField passField = new JPasswordField();

    public LoginPage() {
        super("CampusEats - Login");
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setSize(900, 560);
        setLocationRelativeTo(null);
        setLayout(new GridLayout(1, 2));
        add(buildBanner());
        add(buildForm());
    }

    private JPanel buildBanner() {
        JPanel p = new JPanel() {
            @Override protected void paintComponent(Graphics g) {
                Graphics2D g2 = (Graphics2D) g.create();
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g2.setPaint(new GradientPaint(0, 0, new Color(255, 120, 30), getWidth(), getHeight(), new Color(200, 30, 60)));
                g2.fillRect(0, 0, getWidth(), getHeight());
                g2.setColor(new Color(255, 255, 255, 30));
                g2.fillOval(-80, getHeight() - 200, 300, 300);
                g2.fillOval(getWidth() - 140, -60, 240, 240);
                g2.dispose();
            }
        };
        p.setLayout(new BoxLayout(p, BoxLayout.Y_AXIS));
        p.setBorder(new EmptyBorder(90, 20, 20, 20));
        p.add(centered("🍔 🍕 🍟", new Font("Segoe UI Emoji", Font.PLAIN, 48), Color.WHITE));
        p.add(Box.createVerticalStrut(24));
        p.add(centered("CampusEats", new Font("Segoe UI", Font.BOLD, 40), Color.WHITE));
        p.add(Box.createVerticalStrut(10));
        p.add(centered("Hot food. Fast delivery. Zero queue.", new Font("Segoe UI", Font.PLAIN, 15), new Color(255, 235, 220)));
        p.add(Box.createVerticalStrut(30));
        p.add(centered("🌮 🥤 🍩 🍗", new Font("Segoe UI Emoji", Font.PLAIN, 30), Color.WHITE));
        return p;
    }

    private JLabel centered(String text, Font f, Color c) {
        JLabel l = new JLabel(text);
        l.setFont(f);
        l.setForeground(c);
        l.setAlignmentX(Component.CENTER_ALIGNMENT);
        return l;
    }

    private JPanel buildForm() {
        JPanel p = new JPanel();
        p.setLayout(new BoxLayout(p, BoxLayout.Y_AXIS));
        p.setBorder(new EmptyBorder(80, 60, 40, 60));

        JLabel title = new JLabel("Welcome back ");
        title.setFont(new Font("Segoe UI", Font.BOLD, 28));
        JLabel sub = new JLabel("Sign in to order from your campus restaurants");
        sub.setForeground(Color.GRAY);

        userField.putClientProperty("JTextField.placeholderText", "Username");
        passField.putClientProperty("JTextField.placeholderText", "Password");
        passField.putClientProperty("JPasswordField.showRevealButton", true);
        for (JComponent c : new JComponent[]{userField, passField}) {
            c.putClientProperty("JComponent.roundRect", true);
            c.setMaximumSize(new Dimension(Integer.MAX_VALUE, 42));
            c.setPreferredSize(new Dimension(300, 42));
        }

        JButton login = new JButton("Sign In");
        login.putClientProperty("JButton.buttonType", "roundRect");
        login.setBackground(new Color(255, 110, 40));
        login.setForeground(Color.WHITE);
        login.setFont(new Font("Segoe UI", Font.BOLD, 15));
        login.setMaximumSize(new Dimension(Integer.MAX_VALUE, 44));
        login.addActionListener(e -> doLogin());
        getRootPane().setDefaultButton(login);

        JLabel hint = new JLabel("Demo: student / 1234");
        hint.setForeground(Color.GRAY);

        p.add(title);
        p.add(Box.createVerticalStrut(6));
        p.add(sub);
        p.add(Box.createVerticalStrut(30));
        p.add(userField);
        p.add(Box.createVerticalStrut(14));
        p.add(passField);
        p.add(Box.createVerticalStrut(24));
        p.add(login);
        p.add(Box.createVerticalStrut(14));
        p.add(hint);
        return p;
    }

    private void doLogin() {
        String u = userField.getText().trim();
        if (new UserDAO().validateLogin(u, new String(passField.getPassword()))) {
            new RestaurantDashboard(u).setVisible(true);
            dispose();
        } else {
            JOptionPane.showMessageDialog(this, "Invalid username or password.", "Login failed", JOptionPane.ERROR_MESSAGE);
        }
    }
}