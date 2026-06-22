import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient, type User } from '@supabase/supabase-js';

export interface Product {
  id: string;
  nama_barang: string;
  harga_modal: number;
  harga_jual: number;
  stok: number;
  created_at: string;
  category_id?: string | null;
  user_id?: string | null;
}

export interface Category {
  id: string;
  nama_kategori: string;
  created_at: string;
  user_id?: string | null;
}

export interface StockTransaction {
  id: string;
  product_id: string;
  tipe: 'masuk' | 'keluar';
  jumlah: number;
  created_at: string;
  nama_barang?: string; // joined in frontend
  harga_jual?: number;  // joined in frontend
}

export interface ProductBarcode {
  id: string;
  product_id: string;
  barcode_code: string;
  status: 'in_stock' | 'sold';
  created_at?: string;
  user_id?: string | null;
}

// Custom simple user type for mock mode
interface MockUser {
  id: string;
  email: string;
}

interface StokContextType {
  products: Product[];
  transactions: StockTransaction[];
  categories: Category[];
  barcodes: ProductBarcode[];
  user: User | MockUser | null;
  loading: boolean;
  error: string | null;
  totalModal: number;
  totalOmset: number;
  isSupabaseConnected: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  addProduct: (nama: string, hargaModal: number, hargaJual: number, stokAwal: number, categoryId?: string | null) => Promise<void>;
  updateProduct: (id: string, nama: string, hargaModal: number, hargaJual: number, categoryId?: string | null) => Promise<void>;
  addTransaction: (productId: string, tipe: 'masuk' | 'keluar', jumlah: number) => Promise<void>;
  addScanTransaction: (amount: number, description: string) => Promise<void>;
  scanInBarcode: (productId: string, barcode: string) => Promise<void>;
  scanOutBarcode: (barcode: string) => Promise<string>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (nama: string) => Promise<void>;
  updateCategory: (id: string, nama: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  clearError: () => void;
}

const StokContext = createContext<StokContextType | undefined>(undefined);

export const useStok = () => {
  const context = useContext(StokContext);
  if (!context) {
    throw new Error('useStok must be used within a StokProvider');
  }
  return context;
};

// Setup Supabase client optionally (hybrid mode)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const isSupabaseConfigured = !!(supabaseUrl.trim() && supabaseKey.trim() && !supabaseUrl.includes('your-project-id'));

const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;

export const StokProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | MockUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [barcodes, setBarcodes] = useState<ProductBarcode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFromSupabase = async () => {
    if (!supabase || !supabase.auth.getSession()) return;
    try {
      const { data: cData, error: cError } = await supabase
        .from('categories')
        .select('*')
        .order('nama_kategori', { ascending: true });
      if (cError) throw cError;
      setCategories(cData || []);

      const { data: pData, error: pError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (pError) throw pError;
      setProducts(pData || []);

      const { data: tData, error: tError } = await supabase
        .from('stock_transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (tError) throw tError;
      setTransactions(tData || []);

      const { data: bData, error: bError } = await supabase
        .from('product_barcodes')
        .select('*');
      if (bError) throw bError;
      setBarcodes(bData || []);
    } catch (err: any) {
      console.error('Supabase fetch error:', err);
      setError(err.message || 'Gagal mengambil data dari Supabase.');
    }
  };

  // Auth Listener
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      setLoading(true);
      
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchFromSupabase();
        } else {
          setProducts([]);
          setTransactions([]);
          setCategories([]);
          setBarcodes([]);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // LocalStorage Mock mode auth loading
      try {
        const storedUser = localStorage.getItem('stokplan_active_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        
        // Seed mock database users and data if empty
        const storedMockUsers = localStorage.getItem('stokplan_mock_users');
        if (!storedMockUsers) {
          const initialMockUsers = [
            { id: 'mock-user-1', email: 'toko1@gmail.com', password: 'toko123' },
            { id: 'mock-user-2', email: 'toko2@gmail.com', password: 'toko123' },
            { id: 'mock-user-3', email: 'toko3@gmail.com', password: 'toko123' }
          ];
          localStorage.setItem('stokplan_mock_users', JSON.stringify(initialMockUsers));
        }

        // Seed initial categories & products for mock-user-1 if not exists
        const storedCategories = localStorage.getItem('stokplan_categories');
        if (!storedCategories) {
          const initialCategories: Category[] = [
            { id: 'c1', nama_kategori: 'Sembako', user_id: 'mock-user-1', created_at: new Date().toISOString() },
            { id: 'c2', nama_kategori: 'Alat Mandi', user_id: 'mock-user-1', created_at: new Date().toISOString() },
            { id: 'c3', nama_kategori: 'Snack Gurih', user_id: 'mock-user-2', created_at: new Date().toISOString() },
            { id: 'c4', nama_kategori: 'Obat-obatan', user_id: 'mock-user-3', created_at: new Date().toISOString() }
          ];
          localStorage.setItem('stokplan_categories', JSON.stringify(initialCategories));
        }

        const storedProducts = localStorage.getItem('stokplan_products');
        if (!storedProducts) {
          const initialProducts: Product[] = [
            { id: 'p1', nama_barang: 'Beras Pandan Wangi 5kg', harga_modal: 65000, harga_jual: 78000, stok: 12, category_id: 'c1', user_id: 'mock-user-1', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
            { id: 'p2', nama_barang: 'Minyak Goreng 2L', harga_modal: 28000, harga_jual: 34000, stok: 20, category_id: 'c1', user_id: 'mock-user-1', created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
            { id: 'p3', nama_barang: 'Sabun Mandi Liquid 500ml', harga_modal: 18000, harga_jual: 24000, stok: 5, category_id: 'c2', user_id: 'mock-user-1', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
            { id: 'p4', nama_barang: 'Kripik Kentang Neon 50g', harga_modal: 6000, harga_jual: 8500, stok: 15, category_id: 'c3', user_id: 'mock-user-2', created_at: new Date(Date.now() - 86400000 * 2).toISOString() }
          ];
          localStorage.setItem('stokplan_products', JSON.stringify(initialProducts));
        }

        const storedTransactions = localStorage.getItem('stokplan_transactions');
        if (!storedTransactions) {
          const initialTransactions: StockTransaction[] = [
            { id: 't1', product_id: 'p1', tipe: 'masuk', jumlah: 12, created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
            { id: 't2', product_id: 'p2', tipe: 'masuk', jumlah: 20, created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
            { id: 't3', product_id: 'p3', tipe: 'masuk', jumlah: 5, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
            { id: 't4', product_id: 'p4', tipe: 'masuk', jumlah: 15, created_at: new Date(Date.now() - 86400000 * 1).toISOString() }
          ];
          localStorage.setItem('stokplan_transactions', JSON.stringify(initialTransactions));
        }
      } catch (err) {
        console.error('LocalStorage Auth load error:', err);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  // Fetch local mock data matching current user's user_id
  useEffect(() => {
    if (!isSupabaseConfigured && !supabase) {
      if (user) {
        try {
          const storedCategories = localStorage.getItem('stokplan_categories');
          const storedProducts = localStorage.getItem('stokplan_products');
          const storedTransactions = localStorage.getItem('stokplan_transactions');
          const storedBarcodes = localStorage.getItem('stokplan_barcodes');

          const allCats: Category[] = storedCategories ? JSON.parse(storedCategories) : [];
          const allProds: Product[] = storedProducts ? JSON.parse(storedProducts) : [];
          const allTxs: StockTransaction[] = storedTransactions ? JSON.parse(storedTransactions) : [];
          const allBarcodes: ProductBarcode[] = storedBarcodes ? JSON.parse(storedBarcodes) : [];

          // Filter by active mock user ID
          const userCats = allCats.filter(c => c.user_id === user.id);
          const userProds = allProds.filter(p => p.user_id === user.id);
          const userTxs = allTxs.filter(t => userProds.some(p => p.id === t.product_id));
          const userBarcodes = allBarcodes.filter(b => b.user_id === user.id);

          setCategories(userCats);
          setProducts(userProds);
          setTransactions(userTxs);
          setBarcodes(userBarcodes);
        } catch (err) {
          console.error('Local filter error:', err);
        }
      } else {
        setCategories([]);
        setProducts([]);
        setTransactions([]);
        setBarcodes([]);
      }
    } else if (user) {
      fetchFromSupabase();
    }
  }, [user]);

  // Auth Operations
  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!email.trim() || !pass.trim()) throw new Error('Email dan password tidak boleh kosong');

      if (isSupabaseConfigured && supabase) {
        const { error: authErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pass.trim()
        });
        if (authErr) throw authErr;
      } else {
        // Local Mock Sign In
        const storedMockUsers = localStorage.getItem('stokplan_mock_users');
        const mockUsersList = storedMockUsers ? JSON.parse(storedMockUsers) : [];
        
        const matched = mockUsersList.find(
          (u: any) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === pass
        );

        if (!matched) {
          throw new Error('Email atau password salah (Coba: toko1@gmail.com / toko123)');
        }

        const activeUsr = { id: matched.id, email: matched.email };
        setUser(activeUsr);
        localStorage.setItem('stokplan_active_user', JSON.stringify(activeUsr));
      }
    } catch (err: any) {
      setError(err.message || 'Login gagal');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!email.trim() || !pass.trim()) throw new Error('Email dan password tidak boleh kosong');
      if (pass.length < 6) throw new Error('Password minimal harus 6 karakter');

      if (isSupabaseConfigured && supabase) {
        const { error: authErr } = await supabase.auth.signUp({
          email: email.trim(),
          password: pass.trim()
        });
        if (authErr) throw authErr;
        // Supabase sends a confirmation email or auto-logs in depending on config
      } else {
        // Local Mock Sign Up
        const storedMockUsers = localStorage.getItem('stokplan_mock_users');
        const mockUsersList = storedMockUsers ? JSON.parse(storedMockUsers) : [];

        const isExist = mockUsersList.some((u: any) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (isExist) throw new Error('Email sudah terdaftar!');

        const newUserObj = {
          id: `user_${Date.now()}`,
          email: email.trim().toLowerCase(),
          password: pass
        };

        const updatedUsersList = [...mockUsersList, newUserObj];
        localStorage.setItem('stokplan_mock_users', JSON.stringify(updatedUsersList));

        const activeUsr = { id: newUserObj.id, email: newUserObj.email };
        setUser(activeUsr);
        localStorage.setItem('stokplan_active_user', JSON.stringify(activeUsr));
      }
    } catch (err: any) {
      setError(err.message || 'Pendaftaran akun gagal');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: authErr } = await supabase.auth.signOut();
        if (authErr) throw authErr;
      } else {
        // Local Mock Sign Out
        setUser(null);
        localStorage.removeItem('stokplan_active_user');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal logout');
    } finally {
      setLoading(false);
    }
  };

  const saveToLocalStorage = (newProducts: Product[], newTransactions: StockTransaction[], newCategories: Category[] = categories) => {
    if (user) {
      try {
        const storedCategories = localStorage.getItem('stokplan_categories');
        const storedProducts = localStorage.getItem('stokplan_products');
        const storedTransactions = localStorage.getItem('stokplan_transactions');

        const allCats: Category[] = storedCategories ? JSON.parse(storedCategories) : [];
        const allProds: Product[] = storedProducts ? JSON.parse(storedProducts) : [];
        const allTxs: StockTransaction[] = storedTransactions ? JSON.parse(storedTransactions) : [];

        // 1. Merge updated active user categories back to all categories
        const restCats = allCats.filter(c => c.user_id !== user.id);
        const mergedCats = [...restCats, ...newCategories];

        // 2. Merge updated active user products back to all products
        const restProds = allProds.filter(p => p.user_id !== user.id);
        const mergedProds = [...restProds, ...newProducts];

        // 3. Merge updated active user transactions back to all transactions
        const restTxs = allTxs.filter(t => !newProducts.some(p => p.id === t.product_id));
        const mergedTxs = [...restTxs, ...newTransactions];

        localStorage.setItem('stokplan_categories', JSON.stringify(mergedCats));
        localStorage.setItem('stokplan_products', JSON.stringify(mergedProds));
        localStorage.setItem('stokplan_transactions', JSON.stringify(mergedTxs));
      } catch (err) {
        console.error('Mock Save error:', err);
      }
    }
  };

  // Calculations
  const totalModal = transactions
    .filter(t => t.tipe === 'masuk')
    .reduce((sum, t) => {
      const product = products.find(p => p.id === t.product_id);
      const cost = product ? product.harga_modal : 0;
      return sum + (t.jumlah * cost);
    }, 0);
  
  const totalOmset = transactions
    .filter(t => t.tipe === 'keluar')
    .reduce((sum, t) => {
      const product = products.find(p => p.id === t.product_id);
      const price = product ? product.harga_jual : 0;
      return sum + (t.jumlah * price);
    }, 0);

  // Actions
  const addProduct = async (nama: string, hargaModal: number, hargaJual: number, stokAwal: number, categoryId?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      if (!user) throw new Error('Pengguna tidak terautentikasi');
      if (!nama.trim()) throw new Error('Nama barang tidak boleh kosong');
      if (hargaModal <= 0) throw new Error('Harga modal harus lebih besar dari 0');
      if (hargaJual <= 0) throw new Error('Harga jual harus lebih besar dari 0');
      if (stokAwal < 0) throw new Error('Stok awal tidak boleh negatif');

      if (isSupabaseConfigured && supabase) {
        const { data: newProd, error: pError } = await supabase
          .from('products')
          .insert([{
            nama_barang: nama.trim(),
            harga_modal: hargaModal,
            harga_jual: hargaJual,
            stok: stokAwal,
            category_id: categoryId || null,
            user_id: user.id
          }])
          .select()
          .single();

        if (pError) throw pError;

        if (stokAwal > 0 && newProd) {
          const { error: tError } = await supabase
            .from('stock_transactions')
            .insert([{
              product_id: newProd.id,
              tipe: 'masuk',
              jumlah: stokAwal
            }]);
          if (tError) throw tError;
        }

        await fetchFromSupabase();
      } else {
        // Local mock mode
        const newProduct: Product = {
          id: `p_${Date.now()}`,
          nama_barang: nama.trim(),
          harga_modal: hargaModal,
          harga_jual: hargaJual,
          stok: stokAwal,
          category_id: categoryId || null,
          user_id: user.id,
          created_at: new Date().toISOString()
        };

        const updatedProducts = [newProduct, ...products];
        let updatedTransactions = [...transactions];

        if (stokAwal > 0) {
          const initialTx: StockTransaction = {
            id: `t_${Date.now()}`,
            product_id: newProduct.id,
            tipe: 'masuk',
            jumlah: stokAwal,
            created_at: new Date().toISOString()
          };
          updatedTransactions = [initialTx, ...updatedTransactions];
        }

        setProducts(updatedProducts);
        setTransactions(updatedTransactions);
        saveToLocalStorage(updatedProducts, updatedTransactions);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menambahkan barang');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (id: string, nama: string, hargaModal: number, hargaJual: number, categoryId?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      if (!user) throw new Error('Pengguna tidak terautentikasi');
      if (!nama.trim()) throw new Error('Nama barang tidak boleh kosong');
      if (hargaModal <= 0) throw new Error('Harga modal harus lebih besar dari 0');
      if (hargaJual <= 0) throw new Error('Harga jual harus lebih besar dari 0');

      if (isSupabaseConfigured && supabase) {
        const { error: pError } = await supabase
          .from('products')
          .update({
            nama_barang: nama.trim(),
            harga_modal: hargaModal,
            harga_jual: hargaJual,
            category_id: categoryId || null
          })
          .eq('id', id);

        if (pError) throw pError;
        await fetchFromSupabase();
      } else {
        // Local mock mode
        const updatedProducts = products.map(p => {
          if (p.id === id) {
            return { 
              ...p, 
              nama_barang: nama.trim(), 
              harga_modal: hargaModal, 
              harga_jual: hargaJual, 
              category_id: categoryId || null 
            };
          }
          return p;
        });

        setProducts(updatedProducts);
        saveToLocalStorage(updatedProducts, transactions);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal merubah data barang');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addScanTransaction = async (amount: number, description: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!user) throw new Error('Pengguna tidak terautentikasi');
      const namaItem = `Scan Struk: ${description.trim() || 'Umum'} (#${Date.now().toString().slice(-4)})`;

      if (isSupabaseConfigured && supabase) {
        // 1. Insert product (stok 0 initially)
        const { data: newProd, error: pError } = await supabase
          .from('products')
          .insert([{
            nama_barang: namaItem,
            harga_modal: amount,
            harga_jual: amount,
            stok: 0,
            category_id: null,
            user_id: user.id
          }])
          .select()
          .single();

        if (pError) throw pError;

        if (newProd) {
          // 2. Insert both masuk (stok awal) and keluar (penjualan) transactions to keep audit trail
          const { error: tError } = await supabase
            .from('stock_transactions')
            .insert([
              { product_id: newProd.id, tipe: 'masuk', jumlah: 1 },
              { product_id: newProd.id, tipe: 'keluar', jumlah: 1 }
            ]);
          if (tError) throw tError;
        }

        await fetchFromSupabase();
      } else {
        // Local mock mode
        const mockProdId = `p_scan_${Date.now()}`;
        const newProduct: Product = {
          id: mockProdId,
          nama_barang: namaItem,
          harga_modal: amount,
          harga_jual: amount,
          stok: 0,
          category_id: null,
          user_id: user.id,
          created_at: new Date().toISOString()
        };

        const initialTx: StockTransaction = {
          id: `t_in_${Date.now()}`,
          product_id: mockProdId,
          tipe: 'masuk',
          jumlah: 1,
          created_at: new Date().toISOString()
        };

        const saleTx: StockTransaction = {
          id: `t_out_${Date.now()}`,
          product_id: mockProdId,
          tipe: 'keluar',
          jumlah: 1,
          created_at: new Date().toISOString()
        };

        const updatedProducts = [newProduct, ...products];
        const updatedTransactions = [initialTx, saleTx, ...transactions];

        setProducts(updatedProducts);
        setTransactions(updatedTransactions);
        saveToLocalStorage(updatedProducts, updatedTransactions);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menyimpan hasil scan struk');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (productId: string, tipe: 'masuk' | 'keluar', jumlah: number) => {
    setLoading(true);
    setError(null);
    try {
      if (!user) throw new Error('Pengguna tidak terautentikasi');
      if (jumlah <= 0) throw new Error('Jumlah transaksi harus lebih besar dari 0');

      if (isSupabaseConfigured && supabase) {
        const { error: rpcError } = await supabase
          .rpc('adjust_stock', {
            p_product_id: productId,
            p_tipe: tipe,
            p_jumlah: jumlah
          });

        if (rpcError) throw rpcError;
        await fetchFromSupabase();
      } else {
        // Local mock mode
        const product = products.find(p => p.id === productId);
        if (!product) throw new Error('Barang tidak ditemukan');

        if (tipe === 'keluar' && product.stok < jumlah) {
          throw new Error('Stok tidak cukup');
        }

        const updatedProducts = products.map(p => {
          if (p.id === productId) {
            const newStok = tipe === 'masuk' ? p.stok + jumlah : p.stok - jumlah;
            return { ...p, stok: newStok };
          }
          return p;
        });

        const newTx: StockTransaction = {
          id: `tx_${Date.now()}`,
          product_id: productId,
          tipe,
          jumlah,
          created_at: new Date().toISOString()
        };

        const updatedTransactions = [newTx, ...transactions];

        setProducts(updatedProducts);
        setTransactions(updatedTransactions);
        saveToLocalStorage(updatedProducts, updatedTransactions);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memproses transaksi stok');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!user) throw new Error('Pengguna tidak terautentikasi');
      if (isSupabaseConfigured && supabase) {
        const { error: pError } = await supabase
          .from('products')
          .delete()
          .eq('id', id);
        if (pError) throw pError;
        await fetchFromSupabase();
      } else {
        const updatedProducts = products.filter(p => p.id !== id);
        const updatedTransactions = transactions.filter(t => t.product_id !== id);

        // Hapus barcode barang yang bersangkutan di mode luring
        const storedBarcodes = localStorage.getItem('stokplan_barcodes');
        const allBarcodes: ProductBarcode[] = storedBarcodes ? JSON.parse(storedBarcodes) : [];
        const updatedBarcodes = allBarcodes.filter(b => b.product_id !== id);
        localStorage.setItem('stokplan_barcodes', JSON.stringify(updatedBarcodes));
        setBarcodes(updatedBarcodes.filter(b => b.user_id === user.id));

        setProducts(updatedProducts);
        setTransactions(updatedTransactions);
        saveToLocalStorage(updatedProducts, updatedTransactions);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menghapus barang');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const scanInBarcode = async (productId: string, barcode: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!user) throw new Error('Pengguna tidak terautentikasi');
      if (!barcode.trim()) throw new Error('Kode barcode tidak boleh kosong');

      if (isSupabaseConfigured && supabase) {
        // Cek jika barcode sudah terdaftar di stok yang aktif
        const { data: existing, error: findErr } = await supabase
          .from('product_barcodes')
          .select('*')
          .eq('barcode_code', barcode.trim())
          .eq('user_id', user.id);

        if (findErr) throw findErr;

        if (existing && existing.length > 0) {
          const activeBarcode = existing.find(b => b.status === 'in_stock');
          if (activeBarcode) {
            throw new Error(`Barcode ${barcode} sudah ada dalam stok!`);
          }

          // Jika ada tapi status 'sold', perbarui kembali ke 'in_stock'
          const soldBarcode = existing.find(b => b.status === 'sold');
          if (soldBarcode) {
            const { error: updErr } = await supabase
              .from('product_barcodes')
              .update({ status: 'in_stock', product_id: productId })
              .eq('id', soldBarcode.id);
            if (updErr) throw updErr;
          }
        } else {
          // Daftarkan barcode baru
          const { error: insErr } = await supabase
            .from('product_barcodes')
            .insert([{
              product_id: productId,
              barcode_code: barcode.trim(),
              status: 'in_stock',
              user_id: user.id
            }]);
          if (insErr) throw insErr;
        }

        // Jalankan RPC adjust_stock untuk tambah stok (+1) dan buat transaksi masuk
        const { error: rpcErr } = await supabase
          .rpc('adjust_stock', {
            p_product_id: productId,
            p_tipe: 'masuk',
            p_jumlah: 1
          });
        if (rpcErr) throw rpcErr;

        await fetchFromSupabase();
      } else {
        // Mode Mock LocalStorage
        const storedBarcodes = localStorage.getItem('stokplan_barcodes');
        const allBarcodes: ProductBarcode[] = storedBarcodes ? JSON.parse(storedBarcodes) : [];
        
        const existingBarcode = allBarcodes.find(
          b => b.barcode_code === barcode.trim() && b.user_id === user.id
        );

        if (existingBarcode && existingBarcode.status === 'in_stock') {
          throw new Error(`Barcode ${barcode} sudah ada dalam stok!`);
        }

        let updatedBarcodesList: ProductBarcode[];
        if (existingBarcode && existingBarcode.status === 'sold') {
          updatedBarcodesList = allBarcodes.map(b => {
            if (b.id === existingBarcode.id) {
              return { ...b, status: 'in_stock', product_id: productId };
            }
            return b;
          });
        } else {
          const newB: ProductBarcode = {
            id: `b_${Date.now()}`,
            product_id: productId,
            barcode_code: barcode.trim(),
            status: 'in_stock',
            user_id: user.id,
            created_at: new Date().toISOString()
          };
          updatedBarcodesList = [...allBarcodes, newB];
        }

        const updatedProducts = products.map(p => {
          if (p.id === productId) {
            return { ...p, stok: p.stok + 1 };
          }
          return p;
        });

        const newTx: StockTransaction = {
          id: `tx_${Date.now()}`,
          product_id: productId,
          tipe: 'masuk',
          jumlah: 1,
          created_at: new Date().toISOString()
        };
        const updatedTransactions = [newTx, ...transactions];

        setProducts(updatedProducts);
        setTransactions(updatedTransactions);
        const userBarcodes = updatedBarcodesList.filter(b => b.user_id === user.id);
        setBarcodes(userBarcodes);

        localStorage.setItem('stokplan_barcodes', JSON.stringify(updatedBarcodesList));
        saveToLocalStorage(updatedProducts, updatedTransactions);
      }
    } catch (err: any) {
      console.error('Scan in error:', err);
      setError(err.message || 'Gagal memproses Scan In');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const scanOutBarcode = async (barcode: string): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      if (!user) throw new Error('Pengguna tidak terautentikasi');
      if (!barcode.trim()) throw new Error('Kode barcode tidak boleh kosong');

      if (isSupabaseConfigured && supabase) {
        // Cari barcode aktif
        const { data: bData, error: bError } = await supabase
          .from('product_barcodes')
          .select('*, products(nama_barang)')
          .eq('barcode_code', barcode.trim())
          .eq('status', 'in_stock')
          .eq('user_id', user.id);

        if (bError) throw bError;

        if (!bData || bData.length === 0) {
          throw new Error(`Barcode ${barcode} tidak ada dalam stok atau sudah terjual!`);
        }

        const barcodeRow = bData[0];
        const productId = barcodeRow.product_id;
        const productName = (barcodeRow.products as any)?.nama_barang || 'Barang';

        // Ubah status ke sold
        const { error: updErr } = await supabase
          .from('product_barcodes')
          .update({ status: 'sold' })
          .eq('id', barcodeRow.id);
        if (updErr) throw updErr;

        // Jalankan RPC adjust_stock untuk kurangi stok (-1) dan buat transaksi keluar
        const { error: rpcErr } = await supabase
          .rpc('adjust_stock', {
            p_product_id: productId,
            p_tipe: 'keluar',
            p_jumlah: 1
          });
        if (rpcErr) throw rpcErr;

        await fetchFromSupabase();
        return productName;
      } else {
        // Mode Mock LocalStorage
        const storedBarcodes = localStorage.getItem('stokplan_barcodes');
        const allBarcodes: ProductBarcode[] = storedBarcodes ? JSON.parse(storedBarcodes) : [];

        const barcodeRow = allBarcodes.find(
          b => b.barcode_code === barcode.trim() && b.status === 'in_stock' && b.user_id === user.id
        );

        if (!barcodeRow) {
          throw new Error(`Barcode ${barcode} tidak ada dalam stok atau sudah terjual!`);
        }

        const product = products.find(p => p.id === barcodeRow.product_id);
        if (!product) {
          throw new Error('Barang terkait barcode ini tidak ditemukan!');
        }

        if (product.stok < 1) {
          throw new Error(`Stok untuk barang "${product.nama_barang}" tidak mencukupi untuk dikurangi!`);
        }

        const updatedBarcodesList = allBarcodes.map(b => {
          if (b.id === barcodeRow.id) {
            return { ...b, status: 'sold' as const };
          }
          return b;
        });

        const updatedProducts = products.map(p => {
          if (p.id === product.id) {
            return { ...p, stok: p.stok - 1 };
          }
          return p;
        });

        const newTx: StockTransaction = {
          id: `tx_${Date.now()}`,
          product_id: product.id,
          tipe: 'keluar',
          jumlah: 1,
          created_at: new Date().toISOString()
        };
        const updatedTransactions = [newTx, ...transactions];

        setProducts(updatedProducts);
        setTransactions(updatedTransactions);
        const userBarcodes = updatedBarcodesList.filter(b => b.user_id === user.id);
        setBarcodes(userBarcodes);

        localStorage.setItem('stokplan_barcodes', JSON.stringify(updatedBarcodesList));
        saveToLocalStorage(updatedProducts, updatedTransactions);

        return product.nama_barang;
      }
    } catch (err: any) {
      console.error('Scan out error:', err);
      setError(err.message || 'Gagal memproses Scan Out');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Category Actions
  const addCategory = async (nama: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!user) throw new Error('Pengguna tidak terautentikasi');
      if (!nama.trim()) throw new Error('Nama kategori tidak boleh kosong');

      if (isSupabaseConfigured && supabase) {
        const { error: cError } = await supabase
          .from('categories')
          .insert([{ nama_kategori: nama.trim(), user_id: user.id }]);
        if (cError) throw cError;
        await fetchFromSupabase();
      } else {
        const newCategory: Category = {
          id: `c_${Date.now()}`,
          nama_kategori: nama.trim(),
          user_id: user.id,
          created_at: new Date().toISOString()
        };
        const updatedCategories = [...categories, newCategory];
        setCategories(updatedCategories);
        saveToLocalStorage(products, transactions, updatedCategories);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menambahkan kategori');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCategory = async (id: string, nama: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!user) throw new Error('Pengguna tidak terautentikasi');
      if (!nama.trim()) throw new Error('Nama kategori tidak boleh kosong');

      if (isSupabaseConfigured && supabase) {
        const { error: cError } = await supabase
          .from('categories')
          .update({ nama_kategori: nama.trim() })
          .eq('id', id);
        if (cError) throw cError;
        await fetchFromSupabase();
      } else {
        const updatedCategories = categories.map(c => 
          c.id === id ? { ...c, nama_kategori: nama.trim() } : c
        );
        setCategories(updatedCategories);
        saveToLocalStorage(products, transactions, updatedCategories);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memperbarui nama kategori');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!user) throw new Error('Pengguna tidak terautentikasi');
      if (isSupabaseConfigured && supabase) {
        const { error: cError } = await supabase
          .from('categories')
          .delete()
          .eq('id', id);
        if (cError) throw cError;
        await fetchFromSupabase();
      } else {
        const updatedCategories = categories.filter(c => c.id !== id);
        const updatedProducts = products.map(p => 
          p.category_id === id ? { ...p, category_id: null } : p
        );
        setCategories(updatedCategories);
        setProducts(updatedProducts);
        saveToLocalStorage(updatedProducts, transactions, updatedCategories);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menghapus kategori');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  // Decorate transactions with product name and price for UI display
  const enrichedTransactions = transactions.map(t => {
    const product = products.find(p => p.id === t.product_id);
    return {
      ...t,
      nama_barang: product ? product.nama_barang : (t.nama_barang || 'Barang Terhapus'),
      harga_jual: product ? product.harga_jual : (t.harga_jual || 0)
    };
  });

  return (
    <StokContext.Provider value={{
      products,
      transactions: enrichedTransactions,
      categories,
      barcodes,
      user,
      loading,
      error,
      totalModal,
      totalOmset,
      isSupabaseConnected: isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
      addProduct,
      updateProduct: updateProduct,
      addTransaction,
      addScanTransaction,
      scanInBarcode,
      scanOutBarcode,
      deleteProduct,
      addCategory,
      updateCategory,
      deleteCategory,
      clearError
    }}>
      {children}
    </StokContext.Provider>
  );
};
