document.addEventListener('DOMContentLoaded', () => {
    const productsTableBody = document.querySelector('#products-table tbody');
    const addProductBtn = document.getElementById('add-product-btn');
    const modal = document.getElementById('product-modal');
    const modalTitle = document.getElementById('modal-title');
    const productForm = document.getElementById('product-form');
    const productIdInput = document.getElementById('product-id');
    const productNameInput = document.getElementById('product-name');
    const productDescriptionInput = document.getElementById('product-description');
    const productCategoryInput = document.getElementById('product-category');
    const productPriceInput = document.getElementById('product-price');
    const productUnitTypeInput = document.getElementById('product-unit-type');
    const saveProductBtn = document.getElementById('save-product-btn');
    const closeBtn = document.querySelector('.close-btn');

    const API_URL = '/api/products'; // Use relative URL

    // --- Fetch and Display Products ---
    async function fetchProducts() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const products = await response.json();
            displayProducts(products);
        } catch (error) {
            console.error('Error fetching products:', error);
            productsTableBody.innerHTML = `<tr><td colspan="6">Error loading products. Please check the console and ensure the server is running.</td></tr>`;
        }
    }

    function displayProducts(products) {
        productsTableBody.innerHTML = ''; // Clear existing rows
        if (!products || products.length === 0) {
            productsTableBody.innerHTML = `<tr><td colspan="6">No products found.</td></tr>`;
            return;
        }

        products.forEach(product => {
            const row = productsTableBody.insertRow();
            row.dataset.id = product.id; // Store ID for easy access

            row.innerHTML = `
                <td>${escapeHtml(product.name)}</td>
                <td>${escapeHtml(product.description || '')}</td>
                <td>${escapeHtml(product.category)}</td>
                <td>${formatCurrency(product.price)}</td>
                <td>${escapeHtml(product.unit_type)}</td>
                <td>
                    <button class="edit-btn" data-id="${product.id}">Edit</button>
                    <button class="delete-btn" data-id="${product.id}">Delete</button>
                </td>
            `;

            // Add event listeners for edit/delete buttons
            row.querySelector('.edit-btn').addEventListener('click', () => openModalForEdit(product));
            row.querySelector('.delete-btn').addEventListener('click', () => deleteProduct(product.id, product.name));
        });
    }

    // --- Modal Handling ---
    function openModalForAdd() {
        modalTitle.textContent = 'Add New Product';
        productForm.reset(); // Clear form fields
        productIdInput.value = ''; // Ensure ID is empty for add
        modal.style.display = 'block';
    }

    function openModalForEdit(product) {
        modalTitle.textContent = 'Edit Product';
        productForm.reset(); // Clear first
        productIdInput.value = product.id;
        productNameInput.value = product.name;
        productDescriptionInput.value = product.description || '';
        productCategoryInput.value = product.category;
        productPriceInput.value = product.price;
        productUnitTypeInput.value = product.unit_type;
        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    // --- API Operations ---
    async function saveProduct(event) {
        event.preventDefault(); // Prevent default form submission

        const productData = {
            name: productNameInput.value.trim(),
            description: productDescriptionInput.value.trim(),
            category: productCategoryInput.value.trim(),
            price: parseFloat(productPriceInput.value),
            unit_type: productUnitTypeInput.value,
        };

        const productId = productIdInput.value;
        const method = productId ? 'PUT' : 'POST';
        const url = productId ? `${API_URL}/${productId}` : API_URL;

        // Basic validation
        if (!productData.name || isNaN(productData.price) || !productData.category || !productData.unit_type) {
            alert('Please fill in all required fields (Name, Price, Category, Unit Type).');
            return;
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Unknown error'}`);
            }

            closeModal();
            fetchProducts(); // Refresh the table
        } catch (error) {
            console.error('Error saving product:', error);
            alert(`Failed to save product: ${error.message}`);
        }
    }

    async function deleteProduct(id, name) {
        if (!confirm(`Are you sure you want to delete the product "${name}"?`)) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({})); // Try to get error details
                throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Failed to delete'}`);
            }

            // Check if response status is 204 (No Content) which is expected for successful DELETE
            if (response.status === 204) {
                 console.log(`Product ${id} deleted successfully.`);
                 fetchProducts(); // Refresh the table
            } else {
                 // Handle unexpected successful response status if needed
                 const result = await response.json();
                 console.warn('Unexpected response status after delete:', response.status, result);
                 fetchProducts(); // Still refresh
            }

        } catch (error) {
            console.error('Error deleting product:', error);
            alert(`Failed to delete product: ${error.message}`);
        }
    }

    // --- Utility Functions ---
    function escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe
             .toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;") // Correct entity for double quote
             .replace(/'/g, "&#039;");
    }

    function formatCurrency(amount) {
        if (amount === null || amount === undefined) return '';
        // Adjust formatting as needed (e.g., for R$)
        return parseFloat(amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // --- Event Listeners ---
    addProductBtn.addEventListener('click', openModalForAdd);
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { // Close modal if clicking outside
        if (event.target == modal) {
            closeModal();
        }
    });
    productForm.addEventListener('submit', saveProduct);

    // --- Initial Load ---
    fetchProducts();
});