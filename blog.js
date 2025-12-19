// Blog functionality - Separate file to avoid conflicts with app.js

// Load blog view
window.loadBlogView = async function () {
    const container = document.getElementById('blog-list');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const posts = await SupabaseService.getAllBlogPosts();

        if (posts.length === 0) {
            container.innerHTML = `
                <div class="card text-center" style="padding: 40px; grid-column: 1 / -1;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📝</div>
                    <h3>No hay posts publicados</h3>
                    <p style="color: #888; margin-top: 10px;">Vuelve pronto para leer nuevos artículos</p>
                </div>
            `;
            return;
        }

        container.innerHTML = posts.map(post => renderBlogCard(post)).join('');
    } catch (error) {
        console.error('Error loading blog:', error);
        container.innerHTML = '<div style="padding: 20px; color: red; text-align: center;">Error cargando el blog</div>';
    }
};

// Render blog card
function renderBlogCard(post) {
    const author = post.author || { username: 'Anónimo', avatar_url: null };
    const date = new Date(post.created_at).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `
        <div class="blog-card" onclick="openBlogPost('${post.id}')">
            ${post.cover_image ?
            `<img src="${post.cover_image}" alt="${post.title}" class="blog-card-image">` :
            `<div class="blog-card-image" style="background: linear-gradient(135deg, #6366f1, #a855f7); display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 48px;">📝</span>
                </div>`
        }
            <div class="blog-card-content">
                <h3 style="margin-bottom: 10px;">${post.title}</h3>
                ${post.excerpt ? `<p style="color: #888; font-size: 14px; margin-bottom: 15px;">${post.excerpt}</p>` : ''}
                <div class="blog-post-meta">
                    <span>👤 ${author.username}</span>
                    <span>📅 ${date}</span>
                </div>
            </div>
        </div>
    `;
}

// Open blog post modal
window.openBlogPost = async function (postId) {
    try {
        const post = await SupabaseService.getBlogPostById(postId);
        const author = post.author || { username: 'Anónimo' };
        const date = new Date(post.created_at).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const modal = document.getElementById('blog-post-modal');
        const content = document.getElementById('blog-post-content');

        content.innerHTML = `
            ${post.cover_image ?
                `<img src="${post.cover_image}" alt="${post.title}" style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;">` :
                ''
            }
            <h1 style="margin-bottom: 15px;">${post.title}</h1>
            <div class="blog-post-meta" style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #333;">
                <span>👤 ${author.username}</span>
                <span>📅 ${date}</span>
            </div>
            <div style="line-height: 1.8; white-space: pre-wrap;">${post.content}</div>
        `;

        modal.classList.add('active');
    } catch (error) {
        console.error('Error loading post:', error);
        if (window.app && window.app.showToast) {
            window.app.showToast('Error cargando el post', 'error');
        }
    }
};

// Close blog post modal
window.closeBlogPost = function () {
    const modal = document.getElementById('blog-post-modal');
    if (modal) {
        modal.classList.remove('active');
    }
};

// Show create blog post modal
window.showCreateBlogPost = function () {
    const modal = document.getElementById('create-blog-post-modal');
    const form = document.getElementById('blog-post-form');
    const title = document.getElementById('blog-form-title');

    if (title) title.textContent = 'Crear Nuevo Post';
    if (form) form.reset();

    const postIdInput = document.getElementById('blog-post-id');
    if (postIdInput) postIdInput.value = '';

    if (modal) modal.classList.add('active');
};

// Close create blog post modal
window.closeCreateBlogPost = function () {
    const modal = document.getElementById('create-blog-post-modal');
    if (modal) {
        modal.classList.remove('active');
    }
};

// Handle blog post submit
window.handleBlogPostSubmit = async function (event) {
    event.preventDefault();

    // Get current user from Supabase session
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        if (window.app && window.app.showToast) {
            window.app.showToast('Debes estar autenticado', 'error');
        }
        return;
    }

    const postId = document.getElementById('blog-post-id').value;
    const postData = {
        title: document.getElementById('blog-title').value,
        excerpt: document.getElementById('blog-excerpt').value,
        content: document.getElementById('blog-content').value,
        cover_image: document.getElementById('blog-cover-image').value || null,
        published: document.getElementById('blog-published').checked,
        author_id: user.id
    };

    try {
        if (postId) {
            await SupabaseService.updateBlogPost(postId, postData);
            if (window.app && window.app.showToast) {
                window.app.showToast('Post actualizado correctamente', 'success');
            }
        } else {
            await SupabaseService.createBlogPost(postData);
            if (window.app && window.app.showToast) {
                window.app.showToast('Post creado correctamente', 'success');
            }
        }

        closeCreateBlogPost();
        loadBlogView();
        loadAdminBlogList();
    } catch (error) {
        console.error('Error saving post:', error);
        if (window.app && window.app.showToast) {
            window.app.showToast('Error guardando el post', 'error');
        }
    }
};

// Override app.showView to handle blog case
if (window.app && window.app.showView) {
    const originalShowView = window.app.showView.bind(window.app);
    window.app.showView = function (viewName) {
        if (viewName === 'blog') {
            // Hide all views
            document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
            // Show blog view
            const blogView = document.getElementById('view-blog');
            if (blogView) {
                blogView.classList.remove('hidden');
                loadBlogView();
            }
            // Update active tab
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.dataset.view === viewName) {
                    tab.classList.add('active');
                }
            });
        } else {
            originalShowView(viewName);
        }
    };
}

// Load admin blog list
window.loadAdminBlogList = async function () {
    const container = document.getElementById('admin-blog-list');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const posts = await SupabaseService.getAdminBlogPosts();

        if (posts.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #888;">No hay posts aún</p>';
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Título</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${posts.map(post => `
                        <tr>
                            <td>${post.title}</td>
                            <td>
                                <span class="badge badge-${post.published ? 'success' : 'secondary'}">
                                    ${post.published ? 'Publicado' : 'Borrador'}
                                </span>
                            </td>
                            <td>${new Date(post.created_at).toLocaleDateString('es-ES')}</td>
                            <td>
                                <button class="btn btn-secondary btn-small" onclick="editBlogPost('${post.id}')" title="Editar">✏️</button>
                                <button class="btn btn-secondary btn-small" onclick="togglePublishBlogPost('${post.id}')" title="Publicar/Despublicar">
                                    ${post.published ? '👁️' : '🔒'}
                                </button>
                                <button class="btn btn-secondary btn-small" onclick="deleteBlogPost('${post.id}')" title="Eliminar">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading admin blog list:', error);
        container.innerHTML = '<p style="color: red;">Error cargando posts</p>';
    }
};

// Edit blog post
window.editBlogPost = async function (postId) {
    try {
        const post = await SupabaseService.getBlogPostById(postId);

        const modal = document.getElementById('create-blog-post-modal');
        const title = document.getElementById('blog-form-title');

        if (title) title.textContent = 'Editar Post';

        document.getElementById('blog-post-id').value = post.id;
        document.getElementById('blog-title').value = post.title;
        document.getElementById('blog-excerpt').value = post.excerpt || '';
        document.getElementById('blog-content').value = post.content;
        document.getElementById('blog-cover-image').value = post.cover_image || '';
        document.getElementById('blog-published').checked = post.published;

        if (modal) modal.classList.add('active');
    } catch (error) {
        console.error('Error loading post for edit:', error);
        if (window.app && window.app.showToast) {
            window.app.showToast('Error cargando el post', 'error');
        }
    }
};

// Delete blog post
window.deleteBlogPost = async function (postId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este post?')) return;

    try {
        await SupabaseService.deleteBlogPost(postId);
        if (window.app && window.app.showToast) {
            window.app.showToast('Post eliminado correctamente', 'success');
        }
        loadAdminBlogList();
    } catch (error) {
        console.error('Error deleting post:', error);
        if (window.app && window.app.showToast) {
            window.app.showToast('Error eliminando el post', 'error');
        }
    }
};

// Toggle publish status
window.togglePublishBlogPost = async function (postId) {
    try {
        await SupabaseService.toggleBlogPostPublish(postId);
        if (window.app && window.app.showToast) {
            window.app.showToast('Estado actualizado correctamente', 'success');
        }
        loadAdminBlogList();
    } catch (error) {
        console.error('Error toggling publish:', error);
        if (window.app && window.app.showToast) {
            window.app.showToast('Error actualizando el post', 'error');
        }
    }
};

// Hook into admin view load
if (window.app && window.app.loadAdminView) {
    const originalLoadAdminView = window.app.loadAdminView.bind(window.app);
    window.app.loadAdminView = async function () {
        await originalLoadAdminView();
        // Load blog list after a short delay to ensure admin view is loaded
        setTimeout(() => {
            loadAdminBlogList();
        }, 500);
    };
}

console.log('✅ Blog.js loaded successfully');
