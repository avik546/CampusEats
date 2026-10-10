package campuseats.frontend;

import campuseats.backend.CartService;
import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;

public class RestaurantDashboard extends JFrame {

    private final CartService cart = new CartService();
    private final JLabel badge = new JLabel("0", SwingConstants.CENTER) {
        @Override protected void paintComponent(Graphics g) {
            Graphics2D g2 = (Graphics2D) g.create();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setColor(new Color(235, 60, 70));
            g2.fillOval(0, 0, getWidth(), getHeight());
            g2.dispose();
            super.paintComponent(g);
        }
    };

    private static final String[] NAMES = {"Food Haven", "Zorkko", "Periodt", "Food Paradise", "Campus Bites", "Quick Meals"};
    private static final String[] ICONS = {"🍔", "🍕", "🌮", "🍜", "🥪", "🍗"};
    private static final String[] TAGS = {"Burgers • Fries", "Pizza • Pasta", "Street Food", "Asian • Noodles", "Sandwiches • Coffee", "Fried Chicken • Wraps"};
    private static final String[] RATINGS = {"4.6", "4.4", "4.7", "4.3", "4.5", "4.2"};
    private static final String[] TIMES = {"15-20 min", "20-25 min", "10-15 min", "25-30 min", "10-15 min", "5-10 min"};

    public RestaurantDashboard(String user) {
        super("CampusEats - Restaurants");
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setSize(1000, 680);
        setLocationRelativeTo(null);
        setLayout(new BorderLayout());

        cart.addChangeListener(this::refreshBadge);

        // Top navigation bar
        JPanel bar = new JPanel(new BorderLayout());
        bar.setBackground(new Color(28, 30, 38));
        bar.setBorder(new EmptyBorder(14, 24, 14, 24));
        JLabel logo = new JLabel("🍔 CampusEats");
        logo.setFont(new Font("Segoe UI", Font.BOLD, 22));
        logo.setForeground(new Color(255, 130, 50));

        JPanel right = new JPanel(new FlowLayout(FlowLayout.RIGHT, 14, 0));
        right.setOpaque(false);
        JLabel hi = new JLabel("Hi, " + user);
        JLabel cartIcon = new JLabel("🛒");
        cartIcon.setFont(new Font("Segoe UI Emoji", Font.PLAIN, 24));
        badge.setPreferredSize(new Dimension(22, 22));
        badge.setForeground(Color.WHITE);
        badge.setFont(new Font("Segoe UI", Font.BOLD, 12));
        JButton logout = new JButton("Logout");
        logout.addActionListener(e -> { dispose(); new LoginPage().setVisible(true); });
        right.add(hi); right.add(cartIcon); right.add(badge); right.add(logout);
        bar.add(logo, BorderLayout.WEST);
        bar.add(right, BorderLayout.EAST);
        add(bar, BorderLayout.NORTH);

        // Restaurant grid
        JPanel body = new JPanel(new BorderLayout());
        body.setBorder(new EmptyBorder(20, 24, 24, 24));
        JLabel h = new JLabel("Restaurants on campus");
        h.setFont(new Font("Segoe UI", Font.BOLD, 22));
        h.setBorder(new EmptyBorder(0, 0, 16, 0));
        JPanel grid = new JPanel(new GridLayout(2, 3, 18, 18));
        for (int i = 0; i < 6; i++) grid.add(card(i));
        body.add(h, BorderLayout.NORTH);
        body.add(grid, BorderLayout.CENTER);
        add(body, BorderLayout.CENTER);
    }

    private JPanel card(int i) {
        final boolean[] hover = {false};
        JPanel c = new JPanel() {
            @Override protected void paintComponent(Graphics g) {
                Graphics2D g2 = (Graphics2D) g.create();
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g2.setColor(hover[0] ? new Color(52, 56, 70) : new Color(38, 41, 52));
                g2.fillRoundRect(0, 0, getWidth(), getHeight(), 24, 24);
                if (hover[0]) {
                    g2.setColor(new Color(255, 120, 40));
                    g2.drawRoundRect(0, 0, getWidth() - 1, getHeight() - 1, 24, 24);
                }
                g2.dispose();
            }
        };
        c.setOpaque(false);
        c.setLayout(new BoxLayout(c, BoxLayout.Y_AXIS));
        c.setBorder(new EmptyBorder(24, 20, 20, 20));
        c.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));

        JLabel icon = new JLabel(ICONS[i]);
        icon.setFont(new Font("Segoe UI Emoji", Font.PLAIN, 52));
        JLabel name = new JLabel(NAMES[i]);
        name.setFont(new Font("Segoe UI", Font.BOLD, 19));
        JLabel tag = new JLabel(TAGS[i]);
        tag.setForeground(Color.GRAY);
        JLabel meta = new JLabel("⭐ " + RATINGS[i] + "   •   🕒 " + TIMES[i]);
        meta.setForeground(new Color(255, 170, 90));
        for (JLabel l : new JLabel[]{icon, name, tag, meta}) l.setAlignmentX(Component.LEFT_ALIGNMENT);

        c.add(icon); c.add(Box.createVerticalStrut(12)); c.add(name);
        c.add(Box.createVerticalStrut(4)); c.add(tag);
        c.add(Box.createVerticalGlue()); c.add(meta);

        c.addMouseListener(new MouseAdapter() {
            @Override public void mouseEntered(MouseEvent e) { hover[0] = true; c.repaint(); }
            @Override public void mouseExited(MouseEvent e) { hover[0] = false; c.repaint(); }
            @Override public void mouseClicked(MouseEvent e) {
                new MenuAndCheckoutWindow(RestaurantDashboard.this, cart, NAMES[i], ICONS[i]).setVisible(true);
            }
        });
        return c;
    }

    private void refreshBadge() {
        badge.setText(String.valueOf(cart.getCount()));
        badge.repaint();
    }
}