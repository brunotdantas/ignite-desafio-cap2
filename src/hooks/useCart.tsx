import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      // Checar se já existe o produto no carrinho
      const productAlreadyInCart = cart.find(product => product.id == productId);

      // add produto no carrinho caso ele já não exista 
      if (!productAlreadyInCart) {
        const { data: product } = await api.get<Product>(`products/${productId}`); //retorna dados de produto 
        const { data: stock } = await api.get<Stock>(`stock/${productId}`); //retorna quantidade em estoque disponível 

        // se tem no estoque 
        if (stock.amount > 0) {
          setCart([...cart, { ...product, amount: 1 }]) // se não tiver add com quantidade 1 
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, { ...product, amount: 1 }]))
          toast('Item adicionado ao carrinho');
          return;
        }
      }

      if (productAlreadyInCart) {
        const { data: stock } = await api.get<Product>(`stock/${productId}`)

        if (stock.amount > productAlreadyInCart.amount) {
          const updatedCart = cart.map(cartItem => cartItem.id == productId ? {
            ...cartItem,
            amount: Number(cartItem.amount + 1)
          } : cartItem)

          setCart(updatedCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
          toast('adicionado')
          return;
        } else {
          toast.error('Quantidade solicitada fora de estoque')
        }
      }


    } catch (err) {
      toast.error('Erro na adição do produto');
      console.log(err);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.some(cartProduct => cartProduct.id == productId);
      if (!productExists) {
        // se o produto não consta no carrinho não permitir a remoção 
        toast.error('Erro na remoção do produto');
        return
      }

      const updatedCart = cart.filter(cartItem => cartItem.id != productId)
      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        toast.error('Erro na alteração de quantidade do produto')
        return
      }

      const response = await api.get(`/stock/${productId}`)
      const availableQuantity = response.data.amount

      if (amount > availableQuantity) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const productExists = cart.some(cartProduct => cartProduct.id == productId);
      if (!productExists) {
        toast.error('Erro na alteração de quantidade do produto')
        return
      }

      const updatedCart = cart.map(cartItem => cartItem.id == productId ? {
        ...cartItem,
        amount: amount
      } : cartItem)

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
