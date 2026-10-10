package campuseats.frontend;

import campuseats.backend.CartItem;
import campuseats.backend.CartService;
import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;

public class MenuAndCheckoutWindow extends JFrame {
    private static final String[] ITEMS = {"Classic Burger", "Cheese Pizza", "Crispy Fries", "Chicken Wrap", "Cold Coffee", "Chocolate Shake"};
    private static final double[] PRICES = {120, 180, 80, 140, 90, 110};
    private static final String[] ICONS = {"🍔", "🍕", "🍟", "🌯", "☕", "🥤"};

    private final CartService cart;
    private final DefaultListModel<String> cartModel = new DefaultListModel<>();
    private final JList<String> cartList = new JList<>(cartModel);
    private final JLabel totalLabel = new JLabel();

    public MenuAndCheckoutWindow(JFrame owner, CartService cart, String restaurant, String emoji) {
        super(restaurant + " - Menu");
        this.cart = cart;
        setDefaultCloseOperation(DISPOSE_ON_CLOSE);
        setSize(900, 620);
        setLocationRelativeTo(owner);
        setLayout(new BorderLayout());

        JLabel title = new JLabel(emoji + "  " + restaurant);
        title.setFont(new Font("Segoe UI Emoji", Font.BOLD, 26));
        title.setBorder(new EmptyBorder(18, 24, 10, 24));
        add(title, BorderLayout.NORTH);

        // Menu list
        JPanel menu = new JPanel();
        menu.setLayout(new BoxLayout(menu, BoxLayout.Y_AXIS));
        menu.setBorder(new EmptyBorder(6, 24, 20, 12));
        for (int i = 0; i < ITEMS.length; i++) menu.add(menuRow(i));
        JScrollPane sp = new JScrollPane(menu);
        sp.setBorder(null);
        add(sp, BorderLayout.CENTER);

        // Cart drawer
        JPanel drawer = new JPanel(new BorderLayout(0, 10));
        drawer.setPreferredSize(new Dimension(300, 0));
        drawer.setBackground(new Color(30, 32, 41));
        drawer.setBorder(new EmptyBorder(20, 18, 20, 18));
        JLabel ch = new JLabel("🛒 Your Cart");
        ch.setFont(new Font("Segoe UI Emoji", Font.BOLD, 18));
        cartList.setFont(new Font("Segoe UI", Font.PLAIN, 14));
        cartList.setFixedCellHeight(30);
        JButton remove = new JButton("Remove selected");
        remove.addActionListener(e -> {
            cart.removeOne(cartList.getSelectedIndex());
            refreshCart();
        });
        totalLabel.setFont(new Font("Segoe UI", Font.BOLD, 18));
        JButton pay = new JButton("Pay & Place Order");
        pay.setBackground(new Color(255, 110, 40));
        pay.setForeground(Color.WHITE);
        pay.setFont(new Font("Segoe UI", Font.BOLD, 15));
        pay.setPreferredSize(new Dimension(0, 46));
        pay.addActionListener(e -> checkout());

        JPanel bottom = new JPanel(new GridLayout(3, 1, 0, 8));
        bottom.setOpaque(false);
        bottom.add(remove); bottom.add(totalLabel); bottom.add(pay);
        drawer.add(ch, BorderLayout.NORTH);
        drawer.add(new JScrollPane(cartList), BorderLayout.CENTER);
        drawer.add(bottom, BorderLayout.SOUTH);
        add(drawer, BorderLayout.EAST);

        refreshCart();
    }

    private JPanel menuRow(int i) {
        JPanel row = new JPanel(new BorderLayout(14, 0)) {
            @Override protected void paintComponent(Graphics g) {
                Graphics2D g2 = (Graphics2D) g.create();
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g2.setColor(new Color(38, 41, 52));
                g2.fillRoundRect(0, 0, getWidth(), getHeight(), 18, 18);
                g2.dispose();
            }
        };
        row.setOpaque(false);
        row.setBorder(new EmptyBorder(12, 16, 12, 16));

        JLabel icon = new JLabel(ICONS[i]);
        icon.setFont(new Font("Segoe UI Emoji", Font.PLAIN, 32));
        JLabel info = new JLabel("<html><b style='font-size:13px'>" + ITEMS[i] + "</b><br><span style='color:#ff9a55'>₹"
                + (int) PRICES[i] + "</span></html>");
        JButton add = new JButton("Add to Cart");
        add.addActionListener(e -> {
            cart.add(ITEMS[i], PRICES[i]);
            refreshCart();
        });
        row.add(icon, BorderLayout.WEST);
        row.add(info, BorderLayout.CENTER);
        row.add(add, BorderLayout.EAST);

        JPanel wrap = new JPanel(new BorderLayout());
        wrap.setOpaque(false);
        wrap.setBorder(new EmptyBorder(0, 0, 10, 0));
        wrap.setMaximumSize(new Dimension(Integer.MAX_VALUE, 86));
        wrap.add(row);
        return wrap;
    }

    private void refreshCart() {
        cartModel.clear();
        for (CartItem ci : cart.getItems()) {
            cartModel.addElement(ci.getQty() + " x " + ci.getName() + "  —  ₹" + (int) ci.getSubtotal());
        }
        totalLabel.setText("Total: ₹" + (int) cart.getTotal());
    }

    private void checkout() {
        if (cart.isEmpty()) {
            JOptionPane.showMessageDialog(this, "Your cart is empty. Add something tasty first!", "Cart empty", JOptionPane.WARNING_MESSAGE);
            return;
        }
        JOptionPane.showMessageDialog(this, "Order Placed Successfully!\nYour food is on its way 🚀", "Success", JOptionPane.INFORMATION_MESSAGE);
        cart.clear();
        dispose();
    }
}