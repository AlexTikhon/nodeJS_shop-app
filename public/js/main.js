const adminProductsList = document.getElementById('admin-products-list');

if (adminProductsList) {
  const ensureEmptyState = () => {
    if (adminProductsList.children.length > 0) {
      return;
    }

    adminProductsList.remove();

    const emptyState = document.createElement('h2');
    emptyState.className = 'centered';
    emptyState.id = 'admin-products-empty-state';
    emptyState.textContent = 'No products found.';

    const main = document.querySelector('main');
    if (main) {
      main.appendChild(emptyState);
    }
  };

  adminProductsList.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.classList.contains('js-delete-product-form')) {
      return;
    }

    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const { productId, csrf } = form.dataset;

    if (!productId || !csrf) {
      return;
    }

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
      submitButton.textContent = 'Deleting...';
    }

    try {
      const response = await fetch(`/admin/product/${productId}`, {
        method: 'DELETE',
        headers: {
          'csrf-token': csrf
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete product.');
      }

      const productListItem = form.closest('.product-list-item');
      if (productListItem) {
        productListItem.remove();
        ensureEmptyState();
      }
    } catch (error) {
      alert('Deleting the product failed. Please try again.');

      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
        submitButton.textContent = 'Delete';
      }
    }
  });
}
