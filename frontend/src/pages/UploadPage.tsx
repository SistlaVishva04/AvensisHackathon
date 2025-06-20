import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertCircle, X, Download, Eye, Search } from 'lucide-react';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'success' | 'error' | 'preview';
  progress: number;
  data?: any[];
  headers?: string[];
}

interface ValidationError {
  row: number;
  column: string;
  message: string;
}

const UploadPage: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const sampleData = {
    sales: [
      ['Date', 'Product', 'Category', 'Amount', 'Customer', 'Quantity'],
      ['2024-01-15', 'iPhone 13', 'Electronics', '999.00', 'John Doe', '1'],
      ['2024-01-16', 'MacBook Pro', 'Electronics', '2499.00', 'Jane Smith', '1'],
      ['2024-01-17', 'AirPods', 'Electronics', '199.00', 'Bob Johnson', '2']
    ],
    inventory: [
      ['Product', 'Category', 'Stock', 'Price', 'Supplier', 'SKU'],
      ['iPhone 13', 'Electronics', '50', '999.00', 'Apple Inc', 'IP13-001'],
      ['MacBook Pro', 'Electronics', '25', '2499.00', 'Apple Inc', 'MBP-001'],
      ['AirPods', 'Electronics', '100', '199.00', 'Apple Inc', 'AP-001']
    ],
    customers: [
      ['Name', 'Email', 'Phone', 'City', 'Total Orders', 'Last Purchase'],
      ['John Doe', 'john@example.com', '+1234567890', 'New York', '5', '2024-01-15'],
      ['Jane Smith', 'jane@example.com', '+1234567891', 'Los Angeles', '3', '2024-01-16'],
      ['Bob Johnson', 'bob@example.com', '+1234567892', 'Chicago', '8', '2024-01-17']
    ]
  };

  const downloadSampleCSV = (type: 'sales' | 'inventory' | 'customers') => {
    const data = sampleData[type];
    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sample_${type}_data.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success(`Sample ${type} CSV downloaded!`);
  };

  const parseCSV = (text: string): { headers: string[], data: any[] } => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], data: [] };
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = { _rowIndex: index + 2 };
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return row;
    });
    
    return { headers, data };
  };

  const validateCSVData = (headers: string[], data: any[], fileName: string): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // Check for required columns based on file type
    const requiredColumns: { [key: string]: string[] } = {
      sales: ['Date', 'Product', 'Amount'],
      inventory: ['Product', 'Stock', 'Price'],
      customers: ['Name', 'Email']
    };
    
    const fileType = fileName.toLowerCase().includes('sales') ? 'sales' :
                    fileName.toLowerCase().includes('inventory') ? 'inventory' :
                    fileName.toLowerCase().includes('customer') ? 'customers' : 'sales';
    
    const required = requiredColumns[fileType] || [];
    
    // Check for missing required columns
    required.forEach(col => {
      if (!headers.includes(col)) {
        errors.push({
          row: 0,
          column: col,
          message: `Missing required column: ${col}`
        });
      }
    });
    
    // Validate data rows
    data.forEach((row, index) => {
      // Check for empty required fields
      required.forEach(col => {
        if (!row[col] || row[col].toString().trim() === '') {
          errors.push({
            row: index + 2,
            column: col,
            message: `${col} is required`
          });
        }
      });
      
      // Validate specific field formats
      if (row.Email && !/\S+@\S+\.\S+/.test(row.Email)) {
        errors.push({
          row: index + 2,
          column: 'Email',
          message: 'Invalid email format'
        });
      }
      
      if (row.Amount && isNaN(parseFloat(row.Amount))) {
        errors.push({
          row: index + 2,
          column: 'Amount',
          message: 'Amount must be a valid number'
        });
      }
      
      if (row.Stock && isNaN(parseInt(row.Stock))) {
        errors.push({
          row: index + 2,
          column: 'Stock',
          message: 'Stock must be a valid number'
        });
      }
    });
    
    return errors;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (fileList: File[]) => {
    const validFiles = fileList.filter(file => {
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      
      if (!isCSV) {
        toast.error('Please upload CSV files only');
        return false;
      }
      
      if (!isValidSize) {
        toast.error('File size must be less than 10MB');
        return false;
      }
      
      return true;
    });

    validFiles.forEach(file => {
      const fileId = Math.random().toString(36).substring(7);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const { headers, data } = parseCSV(text);
        const errors = validateCSVData(headers, data, file.name);
        
        const uploadFile: UploadedFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'preview',
          progress: 100,
          data,
          headers
        };

        setFiles(prev => [...prev, uploadFile]);
        setValidationErrors(errors);
        
        if (errors.length === 0) {
          toast.success('File validated successfully!');
        } else {
          toast.error(`Found ${errors.length} validation errors`);
        }
      };
      
      reader.readAsText(file);
    });
  };

  const confirmUpload = (fileId: string) => {
    setFiles(prev => prev.map(file => {
      if (file.id === fileId) {
        simulateUpload(fileId);
        return { ...file, status: 'uploading', progress: 0 };
      }
      return file;
    }));
  };

  const simulateUpload = (fileId: string) => {
    const interval = setInterval(() => {
      setFiles(prev => prev.map(file => {
        if (file.id === fileId) {
          const newProgress = Math.min(file.progress + Math.random() * 20, 100);
          if (newProgress === 100) {
            clearInterval(interval);
            toast.success('File uploaded successfully!');
            return { ...file, progress: 100, status: 'success' };
          }
          return { ...file, progress: newProgress };
        }
        return file;
      }));
    }, 200);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
    if (previewFile?.id === fileId) {
      setPreviewFile(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredData = previewFile?.data?.filter(row =>
    Object.values(row).some(value =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Upload Your Data
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload CSV files containing your sales, inventory, or customer data
          </p>
        </motion.div>

        {/* Sample CSV Downloads */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Download Sample CSV Templates
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { type: 'sales', title: 'Sales Data', desc: 'Date, Product, Amount, Customer' },
              { type: 'inventory', title: 'Inventory Data', desc: 'Product, Stock, Price, Category' },
              { type: 'customers', title: 'Customer Data', desc: 'Name, Email, Phone, Orders' }
            ].map((template) => (
              <button
                key={template.type}
                onClick={() => downloadSampleCSV(template.type as any)}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
              >
                <div className="text-left">
                  <h4 className="font-medium text-gray-900 dark:text-white">{template.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{template.desc}</p>
                </div>
                <Download className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
              </button>
            ))}
          </div>
        </motion.div>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
              dragActive
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-105'
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              accept=".csv"
              onChange={handleChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <motion.div
              animate={{ y: dragActive ? -5 : 0 }}
              className="space-y-4"
            >
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                <Upload className="h-8 w-8 text-white" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Drop your CSV files here
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  or click to select files from your computer
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Maximum file size: 10MB • Supported format: CSV
                </p>
              </div>
              
              <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                <Upload className="h-4 w-4 mr-2" />
                Choose Files
              </button>
            </motion.div>
          </div>
        </motion.div>

        {/* File List */}
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Uploaded Files ({files.length})
            </h3>
            
            <div className="space-y-3">
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      file.status === 'success' 
                        ? 'bg-green-100 dark:bg-green-900/30' 
                        : file.status === 'error'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : file.status === 'preview'
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'bg-yellow-100 dark:bg-yellow-900/30'
                    }`}>
                      {file.status === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : file.status === 'error' ? (
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      ) : file.status === 'preview' ? (
                        <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <FileText className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {file.name}
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      
                      {file.status === 'uploading' && (
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <motion.div
                            className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${file.progress}%` }}
                            transition={{ duration: 0.3 }}
                          ></motion.div>
                        </div>
                      )}
                      
                      {file.status === 'preview' && (
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            {file.data?.length || 0} rows • {file.headers?.length || 0} columns
                          </p>
                          {validationErrors.length > 0 && (
                            <span className="text-xs text-red-600 dark:text-red-400">
                              {validationErrors.length} errors
                            </span>
                          )}
                        </div>
                      )}
                      
                      {file.status === 'success' && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Upload completed successfully
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {file.status === 'preview' && (
                      <>
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => confirmUpload(file.id)}
                          disabled={validationErrors.length > 0}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Upload
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CSV Preview Modal */}
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Preview: {previewFile.name}
                  </h3>
                  <button
                    onClick={() => setPreviewFile(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search data..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              
              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                  <h4 className="font-medium text-red-800 dark:text-red-400 mb-2">
                    Validation Errors ({validationErrors.length})
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {validationErrors.slice(0, 5).map((error, index) => (
                      <p key={index} className="text-sm text-red-700 dark:text-red-300">
                        Row {error.row}, {error.column}: {error.message}
                      </p>
                    ))}
                    {validationErrors.length > 5 && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        ... and {validationErrors.length - 5} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Data Table */}
              <div className="p-6 overflow-auto max-h-96">
                {previewFile.headers && previewFile.headers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          {previewFile.headers.map((header, index) => (
                            <th
                              key={index}
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredData.slice(0, 50).map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            {previewFile.headers!.map((header, cellIndex) => (
                              <td
                                key={cellIndex}
                                className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                              >
                                {row[header] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredData.length > 50 && (
                      <p className="text-center text-gray-500 dark:text-gray-400 mt-4">
                        Showing first 50 rows of {filteredData.length} total rows
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No data to preview</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Data Types Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-3 gap-6"
        >
          {[
            {
              title: 'Sales Data',
              description: 'Upload your sales records with columns like date, amount, product, customer',
              color: 'from-blue-500 to-cyan-500',
              icon: FileText
            },
            {
              title: 'Inventory Data',
              description: 'Track your stock levels with product names, quantities, categories',
              color: 'from-green-500 to-emerald-500',
              icon: FileText
            },
            {
              title: 'Customer Data',
              description: 'Analyze customer behavior with order history, preferences, demographics',
              color: 'from-purple-500 to-pink-500',
              icon: FileText
            }
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
            >
              <div className={`w-12 h-12 bg-gradient-to-r ${item.color} rounded-lg flex items-center justify-center mb-4`}>
                <item.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {item.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {item.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default UploadPage;