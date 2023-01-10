import React, { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { shops } from "./settings";
import { User } from "./Api/server.typings";
import Header from "./components/Header";
import api, { ProductsResponse } from "./Api/api";
import { useDebounce } from "./utils";
import { supportedLanguages } from "./i18n/all";
import Loading from "./components/Loading";

// code below is same as ```import Catalog from "./Pages/Catalog";```
// but uses lazy loading 
const Catalog = lazy(() => import('./Pages/Catalog'));
const Product = lazy(() => import('./Pages/Product'));
const Registration = lazy(() => import('./Pages/Registration'));
const Authorization = lazy(() => import('./Pages/Authorization'));
const Favorites = lazy(() => import('./Pages/Favorites'));
const About = lazy(() => import('./Pages/About'));

export interface ShopPricesContext {
  products: ProductsResponse | undefined;
  setProducts: React.Dispatch<
    React.SetStateAction<ProductsResponse | undefined>
  >;

  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;

  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;

  totalPages: number;
  setTotalPages: React.Dispatch<React.SetStateAction<number>>;
  setToken: React.Dispatch<React.SetStateAction<string>>;
  user: User | null;

  favorites: Array<string>;
}

export const Context = React.createContext<ShopPricesContext>(
  {} as ShopPricesContext
);

function App() {
  const [products, setProducts] = useState<ProductsResponse>();
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [token, setToken] = useState(
    localStorage.getItem("shop-prices-token") || ""
  );
  const [user, setUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<Array<string>>([]);

  async function loadProducts() {
    console.log(searchQuery);
    let data: ProductsResponse | null;
    setProducts(undefined);
    if (searchQuery) {
      data = await api.getProducts({
        page: page,
        pageSize: 40,
        q: searchQuery,
        shopId: shops,
        langs: supportedLanguages.join(","),
      });
    } else {
      data = await api.getProducts({
        page: page,
        pageSize: 40,
        shopId: shops,
        langs: supportedLanguages.join(","),
      });
    }
    // sort price
    if (data) {
      for (const product of data.entries) {
        product.prices = product.prices?.sort((a, b) => a.price - b.price);
      }
      setProducts(data);
    } else {
      // TODO: handle errors
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (page === 0) {
      loadProducts();
    }
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery]);

  useEffect(() => {
    if (products) {
      setTotalPages(
        Math.floor((products?.count || 0) / (products?.pageSize || 1))
      );
    }
  }, [products]);

  useEffect(() => {
    localStorage.setItem("shop-prices-token", token);
    api.setToken(token);
    api.whoami().then(setUser);
  }, [token]);

  useEffect(() => {
    if (user) {
      api.getLikedProductsId().then((likes) => setFavorites(likes || []));
    }
  }, [user]);

  return (
    <Context.Provider
      value={{
        products,
        setProducts,
        searchQuery,
        setSearchQuery,
        page,
        setPage,
        totalPages,
        setTotalPages,
        setToken,
        user,
        favorites,
      }}
    >
      <Header />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path={"/"} element={<Catalog />} />
          <Route path={"product/:id"} element={<Product />} />
          <Route path={"favorites"} element={<Favorites />} />
          <Route path={"register"} element={<Registration />} />
          <Route path={"auth"} element={<Authorization />} />
          <Route path={"about"} element={<About />} />
        </Routes>
      </Suspense>
    </Context.Provider>
  );
}

export default App;
