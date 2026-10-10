package campuseats.backend;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class CartService {
    private final List<CartItem> items = new ArrayList<CartItem>();
    private final List<Runnable> listeners = new ArrayList<Runnable>();

    public void addChangeListener(Runnable r) { listeners.add(r); }

    private void fire() {
        for (Runnable r : new ArrayList<Runnable>(listeners)) r.run();
    }

    public void add(String name, double price) {
        for (CartItem ci : items) {
            if (ci.getName().equals(name)) {
                ci.increment();
                fire();
                return;
            }
        }
        items.add(new CartItem(name, price));
        fire();
    }

    public void removeOne(int index) {
        if (index < 0 || index >= items.size()) return;
        CartItem ci = items.get(index);
        ci.decrement();
        if (ci.getQty() <= 0) items.remove(index);
        fire();
    }

    public void clear() {
        items.clear();
        fire();
    }

    public List<CartItem> getItems() { return Collections.unmodifiableList(items); }

    public int getCount() {
        int n = 0;
        for (CartItem ci : items) n += ci.getQty();
        return n;
    }

    public double getTotal() {
        double t = 0;
        for (CartItem ci : items) t += ci.getSubtotal();
        return t;
    }

    public boolean isEmpty() { return items.isEmpty(); }
}