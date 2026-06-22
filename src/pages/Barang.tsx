import React, { useState } from 'react';
import { useStok, type Product, type Category } from '../context/StokContext';
import { Package, Search, Plus, Minus, Edit3, X, AlertTriangle, Trash2, Folder, FolderPlus, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';

const Barang: React.FC = () => {
  const { 
    products, 
    categories, 
    addTransaction, 
    updateProduct, 
    deleteProduct, 
    addCategory, 
    updateCategory, 
    deleteCategory,
    scanInBarcode,
    error, 
    clearError, 
    loading 
  } = useStok();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategoryId = searchParams.get('category_id'); // null means we are on the folder list
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Barcode scanner states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeScanProductId, setActiveScanProductId] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Modals for Products
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [txType, setTxType] = useState<'masuk' | 'keluar'>('masuk');
  const [txAmount, setTxAmount] = useState<number>(1);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalInputs, setEditModalInputs] = useState({
    id: '',
    nama_barang: '',
    harga_modal: 0,
    harga_jual: 0,
    category_id: ''
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Modals for Categories
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [isRenameCategoryOpen, setIsRenameCategoryOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const [isDeleteCategoryOpen, setIsDeleteCategoryOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Get active category details
  const activeCategory = categories.find(c => c.id === activeCategoryId);
  const isSpecialUncategorized = activeCategoryId === 'uncategorized';

  // Filter products by active category
  const productsInActiveCategory = products.filter(p => {
    if (activeCategoryId === 'uncategorized') {
      return !p.category_id; // Uncategorized products
    }
    if (activeCategoryId) {
      return p.category_id === activeCategoryId;
    }
    return true; // Not used in folder list, but good fallback
  });

  const filteredProducts = productsInActiveCategory
    .filter(p => p.nama_barang.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.harga_jual !== b.harga_jual) {
        return a.harga_jual - b.harga_jual;
      }
      return a.nama_barang.localeCompare(b.nama_barang);
    });

  // Lifecycle hook for barcode scanner camera
  React.useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    
    if (isScannerOpen && activeScanProductId) {
      setScanMessage({ type: 'info', text: 'Menginisialisasi kamera...' });
      
      const timer = setTimeout(() => {
        const elementId = "barang-scanner-reader";
        const element = document.getElementById(elementId);
        if (!element) {
          setScanMessage({ type: 'error', text: 'Gagal menemukan area pemindai kamera.' });
          return;
        }

        try {
          html5QrCode = new Html5Qrcode(elementId);
          html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size };
              }
            },
            async (decodedText) => {
              setScanMessage({ type: 'info', text: `Barcode terdeteksi: ${decodedText}. Memproses...` });
              
              // Play a beep sound using Web Audio API
              try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.1);
              } catch (beepErr) {
                console.log("Audio feedback failed:", beepErr);
              }

              try {
                await scanInBarcode(activeScanProductId, decodedText);
                setScanMessage({ type: 'success', text: `Berhasil mendaftarkan barcode: ${decodedText}!` });
                
                setTimeout(() => {
                  setIsScannerOpen(false);
                  setActiveScanProductId(null);
                  setScanMessage(null);
                }, 1300);
              } catch (err: any) {
                setScanMessage({ type: 'error', text: err.message || 'Gagal memproses Scan In' });
              }
            },
            () => {
              // Ignore verbose errors
            }
          ).then(() => {
            setScanMessage({ type: 'info', text: 'Kamera aktif. Arahkan ke barcode barang.' });
          }).catch((err) => {
            console.error("Camera start error:", err);
            setScanMessage({ type: 'error', text: `Gagal mengakses kamera: ${err.message || err}` });
          });
        } catch (initErr: any) {
          console.error("Scanner init error:", initErr);
          setScanMessage({ type: 'error', text: `Gagal menginisialisasi kamera: ${initErr.message || initErr}` });
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().catch(err => console.error("Error stopping scanner:", err));
        }
      };
    }
  }, [isScannerOpen, activeScanProductId]);

  // Handlers for Transactions
  const openTxModal = (product: Product, type: 'masuk' | 'keluar') => {
    setSelectedProduct(product);
    setTxType(type);
    setTxAmount(1);
    setValidationError(null);
    clearError();
    setIsTxModalOpen(true);
  };

  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (txAmount <= 0) {
      setValidationError('Jumlah barang harus lebih besar dari 0');
      return;
    }

    if (txType === 'keluar' && selectedProduct.stok < txAmount) {
      setValidationError(`Stok tidak cukup. Stok saat ini: ${selectedProduct.stok}`);
      return;
    }

    try {
      await addTransaction(selectedProduct.id, txType, txAmount);
      setIsTxModalOpen(false);
    } catch (err: any) {
      setValidationError(err.message || 'Transaksi gagal');
    }
  };

  // Handlers for Product edits/deletes
  const openEditModal = (product: Product) => {
    setEditModalInputs({
      id: product.id,
      nama_barang: product.nama_barang,
      harga_modal: product.harga_modal,
      harga_jual: product.harga_jual,
      category_id: product.category_id || ''
    });
    setValidationError(null);
    clearError();
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalInputs.nama_barang.trim()) {
      setValidationError('Nama barang tidak boleh kosong');
      return;
    }
    if (editModalInputs.harga_modal <= 0) {
      setValidationError('Harga modal harus lebih besar dari 0');
      return;
    }
    if (editModalInputs.harga_jual <= 0) {
      setValidationError('Harga jual harus lebih besar dari 0');
      return;
    }

    try {
      await updateProduct(
        editModalInputs.id, 
        editModalInputs.nama_barang,
        editModalInputs.harga_modal, 
        editModalInputs.harga_jual,
        editModalInputs.category_id || null
      );
      setIsEditModalOpen(false);
    } catch (err: any) {
      setValidationError(err.message || 'Gagal merubah data barang');
    }
  };

  const openDeleteConfirmModal = (product: Product) => {
    setProductToDelete(product);
    setValidationError(null);
    clearError();
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete.id);
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      setValidationError(err.message || 'Gagal menghapus barang');
    }
  };

  // Handlers for Categories
  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setValidationError('Nama kategori tidak boleh kosong');
      return;
    }
    try {
      await addCategory(newCategoryName);
      setNewCategoryName('');
      setIsAddCategoryOpen(false);
    } catch (err: any) {
      setValidationError(err.message || 'Gagal menambah kategori');
    }
  };

  const openRenameCategory = (category: Category, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigating into category
    setSelectedCategory(category);
    setRenameInput(category.nama_kategori);
    setValidationError(null);
    clearError();
    setIsRenameCategoryOpen(true);
  };

  const handleRenameCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !renameInput.trim()) return;
    try {
      await updateCategory(selectedCategory.id, renameInput);
      setIsRenameCategoryOpen(false);
    } catch (err: any) {
      setValidationError(err.message || 'Gagal mengubah kategori');
    }
  };

  const openDeleteCategory = (category: Category, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigating into category
    setCategoryToDelete(category);
    setValidationError(null);
    clearError();
    setIsDeleteCategoryOpen(true);
  };

  const handleDeleteCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete.id);
      setIsDeleteCategoryOpen(false);
    } catch (err: any) {
      setValidationError(err.message || 'Gagal menghapus kategori');
    }
  };

  // Count uncategorized products
  const uncategorizedCount = products.filter(p => !p.category_id).length;

  return (
    <div className="main-content animate-fade-in">
      
      {/* =========================================================================
          VIEW 1: FOLDER LIST OF CATEGORIES (activeCategoryId is null)
          ========================================================================= */}
      {!activeCategoryId && (
        <>
          <div className="header-bar">
            <div>
              <span className="text-xs text-muted font-bold font-display" style={{ letterSpacing: '1.5px', textTransform: 'uppercase' }}>KATALOG BARANG</span>
              <h1 className="header-title" style={{ margin: 0, fontSize: '28px' }}>Kelompok Barang</h1>
            </div>
            
            <button 
              className="btn btn-primary" 
              onClick={() => {
                setValidationError(null);
                clearError();
                setIsAddCategoryOpen(true);
              }}
              style={{ width: 'auto', padding: '10px 16px', borderRadius: '12px', fontSize: '14px' }}
            >
              <FolderPlus size={16} />
              Kategori
            </button>
          </div>

          <div style={{ margin: '-12px 0 0 0' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Pilih kelompok barang di bawah ini untuk melihat daftar produknya.
            </p>
          </div>

          {/* CATEGORIES GRID */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* List categories from State */}
            {categories.map((category) => {
              const productCount = products.filter(p => p.category_id === category.id).length;
              return (
                <div 
                  key={category.id} 
                  className="glass-card" 
                  onClick={() => setSearchParams({ category_id: category.id })}
                  style={{ 
                    cursor: 'pointer',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '18px 20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                      padding: '10px', 
                      borderRadius: '14px', 
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Folder size={24} style={{ fill: 'rgba(99, 102, 241, 0.2)' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', margin: '0 0 4px 0', fontWeight: 700 }}>
                        {category.nama_kategori}
                      </h3>
                      <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 8px' }}>
                        {productCount} Barang
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn-icon-only" 
                      onClick={(e) => openRenameCategory(category, e)}
                      title="Ubah nama kelompok"
                      style={{ width: '32px', height: '32px', borderRadius: '10px' }}
                    >
                      <Edit3 size={13} />
                    </button>
                    <button 
                      className="btn-icon-only" 
                      onClick={(e) => openDeleteCategory(category, e)}
                      title="Hapus kelompok"
                      style={{ width: '32px', height: '32px', borderRadius: '10px', color: 'var(--danger)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Special Uncategorized Folder (only shows if it has products) */}
            {uncategorizedCount > 0 && (
              <div 
                className="glass-card" 
                onClick={() => setSearchParams({ category_id: 'uncategorized' })}
                style={{ 
                  cursor: 'pointer',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '18px 20px',
                  borderStyle: 'dashed',
                  borderColor: 'var(--text-muted)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    padding: '10px', 
                    borderRadius: '14px', 
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Folder size={24} style={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', margin: '0 0 4px 0', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Umum / Tanpa Kategori
                    </h3>
                    <span className="badge" style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                      {uncategorizedCount} Barang
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {categories.length === 0 && (
              <div className="empty-state glass-card">
                <Folder className="empty-state-icon" />
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  Belum ada kategori yang ditambahkan. Silakan klik tombol "+ Kategori" untuk memulai.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* =========================================================================
          VIEW 2: PRODUCTS INSIDE SELECTED CATEGORY (activeCategoryId is set)
          ========================================================================= */}
      {activeCategoryId && (
        <>
          <div className="header-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                className="btn-icon-only" 
                onClick={() => {
                  setSearchQuery('');
                  setSearchParams({});
                }}
                style={{ borderRadius: '12px' }}
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <span className="text-xs text-muted font-bold font-display" style={{ letterSpacing: '1px', textTransform: 'uppercase' }}>
                  KATEGORI: {isSpecialUncategorized ? 'UMUM' : (activeCategory?.nama_kategori || 'LOADING...')}
                </span>
                <h1 className="header-title" style={{ margin: 0, fontSize: '22px' }}>
                  {isSpecialUncategorized ? 'Tanpa Kategori' : (activeCategory?.nama_kategori || 'Daftar Barang')}
                </h1>
              </div>
            </div>

            <Link 
              to={`/barang/baru?category_id=${activeCategoryId}`} 
              className="btn btn-primary" 
              style={{ width: 'auto', padding: '10px 16px', borderRadius: '12px', fontSize: '14px' }}
            >
              <Plus size={16} />
              Barang
            </Link>
          </div>

          {/* SEARCH BAR */}
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Cari nama barang di kategori ini..." 
              className="input-control" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '44px' }}
            />
            <Search 
              size={18} 
              style={{ 
                position: 'absolute', 
                left: '16px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-muted)' 
              }} 
            />
          </div>

          {/* PRODUCTS LIST */}
          {productsInActiveCategory.length === 0 ? (
            <div className="empty-state glass-card">
              <Package className="empty-state-icon" />
              <div>
                <h3 style={{ margin: '0 0 6px 0' }}>Barang Kosong</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Kategori ini belum memiliki barang terdaftar.
                </p>
              </div>
              <Link to={`/barang/baru?category_id=${activeCategoryId}`} className="btn btn-primary" style={{ width: 'auto' }}>
                Tambah Barang Baru
              </Link>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state glass-card" style={{ padding: '24px' }}>
              <Search className="empty-state-icon" />
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                Barang dengan nama "{searchQuery}" tidak ditemukan.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredProducts.map((product) => (
                <div key={product.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ maxWidth: '70%' }}>
                      <h3 style={{ fontSize: '16px', margin: '0 0 4px 0', lineHeight: 1.3 }}>{product.nama_barang}</h3>
                      <span style={{ 
                        fontSize: '11px', 
                        padding: '3px 8px', 
                        borderRadius: '6px',
                        fontWeight: 600,
                        background: product.stok > 5 ? 'rgba(255,255,255,0.05)' : product.stok > 0 ? 'var(--warning-bg)' : 'var(--danger-bg)',
                        color: product.stok > 5 ? 'var(--text-secondary)' : product.stok > 0 ? 'var(--warning)' : 'var(--danger)'
                      }}>
                        {product.stok > 0 ? `Stok: ${product.stok} unit` : 'Stok Habis'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn-icon-only" 
                        onClick={() => openEditModal(product)}
                        title="Ubah harga"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button 
                        className="btn-icon-only" 
                        onClick={() => openDeleteConfirmModal(product)}
                        style={{ color: 'var(--danger)' }}
                        title="Hapus barang"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* PRICES ROW */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '12px',
                    padding: '12px 14px',
                    background: 'rgba(9, 13, 22, 0.25)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Harga Modal</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {formatRupiah(product.harga_modal)}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Harga Jual</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>
                        {formatRupiah(product.harga_jual)}
                      </span>
                    </div>
                  </div>

                  {/* TRANSACTION BUTTONS */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: '8px' }}>
                    <button 
                      onClick={() => openTxModal(product, 'masuk')} 
                      className="btn btn-secondary" 
                      style={{ padding: '8px 4px', fontSize: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <Plus size={12} className="text-success" />
                      Masuk +
                    </button>
                    
                    <button
                      onClick={() => {
                        setScanMessage(null);
                        setIsScannerOpen(true);
                        setActiveScanProductId(product.id);
                      }}
                      className="btn btn-secondary"
                      style={{ 
                        padding: '8px 4px', 
                        fontSize: '12px', 
                        borderRadius: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        borderColor: 'var(--primary)',
                        color: 'var(--primary)',
                        background: 'rgba(99, 102, 241, 0.05)'
                      }}
                      title="Scan In Barcode"
                    >
                      <span>📷 Scan</span>
                    </button>
                    
                    <button 
                      onClick={() => openTxModal(product, 'keluar')} 
                      className="btn btn-secondary" 
                      disabled={product.stok === 0}
                      style={{ padding: '8px 4px', fontSize: '12px', borderRadius: '10px', opacity: product.stok === 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <Minus size={12} className="text-danger" />
                      Keluar -
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          MODALS AREA
          ========================================================================= */}

      {/* 1. PRODUCT TRANSACTION MODAL */}
      {isTxModalOpen && selectedProduct && (
        <div className="modal-overlay" onClick={() => setIsTxModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {txType === 'masuk' ? 'Tambah Stok (Masuk)' : 'Kurangi Stok (Keluar)'}
              </h3>
              <button className="btn-icon-only" onClick={() => setIsTxModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleTxSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Barang:</span>
                <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '2px' }}>{selectedProduct.nama_barang}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Stok saat ini: {selectedProduct.stok} unit</div>
              </div>

              <div className="form-group">
                <label htmlFor="tx-amount">Jumlah Unit</label>
                <input 
                  id="tx-amount"
                  type="number" 
                  min="1"
                  className="input-control" 
                  value={txAmount}
                  onChange={(e) => {
                    setTxAmount(parseInt(e.target.value) || 0);
                    setValidationError(null);
                  }}
                  required
                />
              </div>

              {/* QUICK NUMBERS */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
                {[1, 5, 10, 25, 50].map(num => (
                  <button 
                    key={num}
                    type="button"
                    className="btn-icon-only"
                    onClick={() => setTxAmount(num)}
                    style={{ 
                      minWidth: '40px', 
                      height: '32px', 
                      borderRadius: '8px', 
                      fontSize: '12px',
                      fontWeight: 600,
                      background: txAmount === num ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      color: txAmount === num ? '#fff' : 'var(--text-secondary)',
                      borderColor: txAmount === num ? 'var(--primary)' : 'var(--border-color)'
                    }}
                  >
                    +{num}
                  </button>
                ))}
              </div>

              {txType === 'masuk' && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}></div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>atau</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}></div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTxModalOpen(false);
                      setScanMessage(null);
                      setIsScannerOpen(true);
                      setActiveScanProductId(selectedProduct.id);
                    }}
                    className="btn btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      width: '100%'
                    }}
                  >
                    <span>📷 Scan Barcode Masuk</span>
                  </button>
                </div>
              )}

              {(validationError || error) && (
                <div className="badge badge-danger" style={{ width: '100%', borderRadius: '12px', padding: '10px 14px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '13px', textAlign: 'left', fontWeight: 500 }}>
                    {validationError || error}
                  </span>
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. PRODUCT EDIT PRICES MODAL */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Ubah Detail Barang</h3>
              <button className="btn-icon-only" onClick={() => setIsEditModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label htmlFor="edit-nama">Nama Barang</label>
                <input 
                  id="edit-nama"
                  type="text" 
                  className="input-control" 
                  value={editModalInputs.nama_barang}
                  onChange={(e) => {
                    setEditModalInputs({ ...editModalInputs, nama_barang: e.target.value });
                    setValidationError(null);
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-kategori">Kategori / Kelompok Barang</label>
                <select 
                  id="edit-kategori"
                  className="input-control"
                  value={editModalInputs.category_id}
                  onChange={(e) => setEditModalInputs({ ...editModalInputs, category_id: e.target.value })}
                  style={{ 
                    background: 'rgba(5, 8, 17, 0.6) url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23cbd5e1\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 16px center',
                    backgroundSize: '16px',
                    paddingRight: '40px',
                    border: '2px solid var(--border-color)'
                  }}
                >
                  <option value="">-- Tanpa Kategori (Umum) --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nama_kategori}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="edit-modal">Harga Modal (Rp)</label>
                <input 
                  id="edit-modal"
                  type="number" 
                  min="1"
                  className="input-control" 
                  value={editModalInputs.harga_modal}
                  onChange={(e) => {
                    setEditModalInputs({ ...editModalInputs, harga_modal: parseInt(e.target.value) || 0 });
                    setValidationError(null);
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-jual">Harga Jual (Rp)</label>
                <input 
                  id="edit-jual"
                  type="number" 
                  min="1"
                  className="input-control" 
                  value={editModalInputs.harga_jual}
                  onChange={(e) => {
                    setEditModalInputs({ ...editModalInputs, harga_jual: parseInt(e.target.value) || 0 });
                    setValidationError(null);
                  }}
                  required
                />
              </div>

              {(validationError || error) && (
                <div className="badge badge-danger" style={{ width: '100%', borderRadius: '12px', padding: '10px 14px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '13px', textAlign: 'left', fontWeight: 500 }}>
                    {validationError || error}
                  </span>
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Perbarui Barang'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. PRODUCT DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && productToDelete && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--danger)' }}>Hapus Barang?</h3>
              <button className="btn-icon-only" onClick={() => setIsDeleteModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleDeleteSubmit}>
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                  Apakah kamu yakin ingin menghapus barang <strong>{productToDelete.nama_barang}</strong>? 
                </p>
                <div className="badge badge-danger" style={{ textTransform: 'none', display: 'flex', gap: '6px', padding: '10px 14px', borderRadius: '12px' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', textAlign: 'left', fontWeight: 600 }}>
                    Tindakan ini permanen. Semua riwayat transaksi barang ini juga akan ikut dihapus.
                  </span>
                </div>
              </div>

              {(validationError || error) && (
                <div className="badge badge-danger" style={{ width: '100%', borderRadius: '12px', padding: '10px 14px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '13px', textAlign: 'left', fontWeight: 500 }}>
                    {validationError || error}
                  </span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-danger" disabled={loading}>
                  {loading ? 'Menghapus...' : 'Ya, Hapus Permanen! 🗑️'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ADD CATEGORY MODAL */}
      {isAddCategoryOpen && (
        <div className="modal-overlay" onClick={() => setIsAddCategoryOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Tambah Kategori Baru 📁</h3>
              <button className="btn-icon-only" onClick={() => setIsAddCategoryOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCategorySubmit}>
              <div className="form-group">
                <label htmlFor="new-cat-name">Nama Kategori</label>
                <input 
                  id="new-cat-name"
                  type="text" 
                  placeholder="Contoh: Alat Mandi, Sembako, dll." 
                  className="input-control"
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    setValidationError(null);
                  }}
                  required
                />
              </div>

              {(validationError || error) && (
                <div className="badge badge-danger" style={{ width: '100%', borderRadius: '12px', padding: '10px 14px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '13px', textAlign: 'left', fontWeight: 500 }}>
                    {validationError || error}
                  </span>
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan Kategori'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. RENAME CATEGORY MODAL */}
      {isRenameCategoryOpen && selectedCategory && (
        <div className="modal-overlay" onClick={() => setIsRenameCategoryOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Ubah Nama Kategori 📝</h3>
              <button className="btn-icon-only" onClick={() => setIsRenameCategoryOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRenameCategorySubmit}>
              <div className="form-group">
                <label htmlFor="rename-cat-input">Nama Kategori Baru</label>
                <input 
                  id="rename-cat-input"
                  type="text" 
                  className="input-control"
                  value={renameInput}
                  onChange={(e) => {
                    setRenameInput(e.target.value);
                    setValidationError(null);
                  }}
                  required
                />
              </div>

              {(validationError || error) && (
                <div className="badge badge-danger" style={{ width: '100%', borderRadius: '12px', padding: '10px 14px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '13px', textAlign: 'left', fontWeight: 500 }}>
                    {validationError || error}
                  </span>
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Perbarui Nama'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE CATEGORY MODAL */}
      {isDeleteCategoryOpen && categoryToDelete && (
        <div className="modal-overlay" onClick={() => setIsDeleteCategoryOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--danger)' }}>Hapus Kategori?</h3>
              <button className="btn-icon-only" onClick={() => setIsDeleteCategoryOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleDeleteCategorySubmit}>
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                  Apakah kamu yakin ingin menghapus kategori <strong>{categoryToDelete.nama_kategori}</strong>?
                </p>
                <div className="badge badge-danger" style={{ textTransform: 'none', display: 'flex', gap: '6px', padding: '10px 14px', borderRadius: '12px' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', textAlign: 'left', fontWeight: 600 }}>
                    Kategori akan dihapus. Barang di dalam kategori ini TIDAK akan dihapus, tetapi akan otomatis dipindahkan ke folder "Umum / Tanpa Kategori".
                  </span>
                </div>
              </div>

              {(validationError || error) && (
                <div className="badge badge-danger" style={{ width: '100%', borderRadius: '12px', padding: '10px 14px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '13px', textAlign: 'left', fontWeight: 500 }}>
                    {validationError || error}
                  </span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteCategoryOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-danger" disabled={loading}>
                  {loading ? 'Menghapus...' : 'Ya, Hapus Kategori! 🗑️'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. CAMERA SCANNER MODAL */}
      {isScannerOpen && activeScanProductId && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '450px', background: '#090d16', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="modal-header">
              <h3 className="modal-title">📷 Pindai Barcode Unit</h3>
              <button 
                className="btn-icon-only" 
                onClick={() => {
                  setIsScannerOpen(false);
                  setActiveScanProductId(null);
                  setScanMessage(null);
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Mendaftarkan unit baru untuk:</span>
              <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '2px' }}>
                {products.find(p => p.id === activeScanProductId)?.nama_barang || 'Barang'}
              </div>
            </div>

            {/* Camera Viewfinder Box */}
            <div style={{ 
              position: 'relative', 
              width: '100%', 
              background: '#000', 
              borderRadius: '16px', 
              overflow: 'hidden', 
              border: '2px solid rgba(99, 102, 241, 0.3)',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)',
              aspectRatio: '1',
              marginBottom: '16px'
            }}>
              <div id="barang-scanner-reader" style={{ width: '100%', height: '100%' }}></div>
              
              {/* Overlay Laser Scan Effect */}
              {scanMessage?.type === 'info' && scanMessage.text.includes('Kamera aktif') && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '4px',
                  background: 'var(--primary)',
                  boxShadow: '0 0 12px var(--primary)',
                  animation: 'laser-scan 2.5s infinite linear',
                  zIndex: 2,
                  pointerEvents: 'none'
                }}></div>
              )}
            </div>

            {/* Hardware Barcode Gun Input */}
            <div style={{ marginBottom: '16px' }}>
              <input 
                type="text" 
                placeholder="Atau tembak barcode dengan scanner gun..." 
                className="input-control" 
                style={{ 
                  padding: '10px 14px', 
                  fontSize: '13px', 
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.1)'
                }}
                autoFocus
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const code = (e.target as HTMLInputElement).value.trim();
                    if (!code) return;
                    setScanMessage({ type: 'info', text: `Memproses barcode: ${code}...` });
                    try {
                      await scanInBarcode(activeScanProductId, code);
                      setScanMessage({ 
                        type: 'success', 
                        text: `Berhasil mendaftarkan barcode: ${code}!` 
                      });
                      (e.target as HTMLInputElement).value = '';
                      setTimeout(() => {
                        setIsScannerOpen(false);
                        setActiveScanProductId(null);
                        setScanMessage(null);
                      }, 1500);
                    } catch (err: any) {
                      setScanMessage({ type: 'error', text: err.message || 'Gagal memproses Scan In' });
                    }
                  }
                }}
              />
            </div>

            {/* Scan Message / Status */}
            {scanMessage && (
              <div className={`badge ${
                scanMessage.type === 'success' ? 'badge-success' : 
                scanMessage.type === 'error' ? 'badge-danger' : 'badge-info'
              }`} style={{ 
                width: '100%', 
                borderRadius: '12px', 
                padding: '12px 14px', 
                display: 'flex', 
                gap: '8px', 
                alignItems: 'flex-start',
                textAlign: 'left',
                fontSize: '13px',
                lineHeight: 1.4,
                marginBottom: '16px'
              }}>
                {scanMessage.type === 'success' && <span>✅</span>}
                {scanMessage.type === 'error' && <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />}
                {scanMessage.type === 'info' && <span className="animate-pulse">🔄</span>}
                <span style={{ fontWeight: 500 }}>{scanMessage.text}</span>
              </div>
            )}

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                setIsScannerOpen(false);
                setActiveScanProductId(null);
                setScanMessage(null);
              }}
              style={{ width: '100%', padding: '12px' }}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Barang;
