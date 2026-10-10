package campuseats.backend;

public class CartItem {
    private final String name;
    private final double price;
    private int qty = 1;

    public CartItem(String name, double price) {
        this.name = name;
        this.price = price;
    }

    public String getName() { return name; }
    public double getPrice() { return price; }
    public int getQty() { return qty; }
    public void increment() { qty++; }
    public void decrement() { qty--; }
    public double getSubtotal() { return qty * price; }
}