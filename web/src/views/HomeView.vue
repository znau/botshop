<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useCatalogStore } from '@/stores/catalog';
import ProductCard from '@/components/catalog/ProductCard.vue';

const catalog = useCatalogStore();
onMounted(() => {
  catalog.fetchCatalog();
});

const limitedFeaturedProducts = computed(() => catalog.featuredProducts.slice(0, 6));

const features = [
  { icon: '🚀', title: '极速配送', desc: '下单即送，快至1小时' },
  { icon: '🔒', title: '安全保障', desc: '正品保证，假一赔十' },
  { icon: '💝', title: '精选好物', desc: '品质优选，值得信赖' },
  { icon: '💰', title: '优惠多多', desc: '每日特价，省钱购物' }
];
</script>

<template>
  <div class="home-view">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">发现优质好物</h1>
        <p class="hero-subtitle">让购物更简单，让生活更美好</p>
        <RouterLink :to="{ name: 'Catalog' }" class="btn btn-primary hero-cta">
          开始购物
          <svg class="icon-sm ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </RouterLink>
      </div>
      <div class="hero-bg"></div>
    </section>

    <!-- Categories -->
    <section v-if="catalog.categories.length > 0" class="categories-section">
      <h2 class="section-title">商品分类</h2>
      <div class="categories-grid">
        <RouterLink
          v-for="category in catalog.categories.slice(0, 8)"
          :key="category.id"
          :to="{ name: 'Catalog', params: { categoryId: category.id } }"
          class="category-card"
        >
          <div class="category-icon">{{ category.name.charAt(0) }}</div>
          <span class="category-name">{{ category.name }}</span>
          <span class="category-count">{{ category.productCount || 0 }} 件</span>
        </RouterLink>
      </div>
    </section>

    <!-- Featured Products -->
    <section v-if="catalog.featuredProducts.length > 0" class="products-section">
      <div class="section-header">
        <h2 class="section-title">精选推荐</h2>
        <RouterLink :to="{ name: 'Catalog' }" class="text-link">
          查看全部
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </RouterLink>
      </div>
      <div class="products-grid">
        <ProductCard v-for="product in limitedFeaturedProducts" :key="product.id" :product="product" />
      </div>
    </section>

    <!-- Features -->
    <section class="features-section">
      <div class="features-grid">
        <div v-for="feature in features" :key="feature.title" class="feature-card">
          <div class="feature-icon">{{ feature.icon }}</div>
          <h3 class="feature-title">{{ feature.title }}</h3>
          <p class="feature-desc">{{ feature.desc }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-view {
  min-height: 100vh;
  padding-bottom: var(--safe-area-bottom, 80px);
}

/* Hero Section */
.hero {
  position: relative;
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: -1rem -1rem 2rem;
  padding: 3rem 1.5rem;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  opacity: 0.95;
  z-index: 0;
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  color: white;
}

.hero-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.hero-subtitle {
  font-size: 1rem;
  opacity: 0.95;
  margin-bottom: 2rem;
}

.hero-cta {
  display: inline-flex;
  align-items: center;
  background: white;
  color: var(--primary);
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.hero-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

/* Categories */
.categories-section {
  margin-bottom: 2.5rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 1.25rem;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.25rem 0.75rem;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s;
  text-decoration: none;
}

.category-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.category-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-light), var(--accent-light));
  border-radius: var(--radius-lg);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.75rem;
}

.category-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.category-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Products */
.products-section {
  margin-bottom: 2.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.text-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--primary);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.2s;
}

.text-link:hover {
  color: var(--primary-dark);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

/* Features */
.features-section {
  margin: 3rem 0 2rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.feature-card {
  padding: 1.5rem;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  text-align: center;
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.feature-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.feature-desc {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* Desktop styles */
@media (min-width: 768px) {
  .hero {
    min-height: 400px;
    margin: -1.5rem -1.5rem 3rem;
  }

  .hero-title {
    font-size: 3rem;
  }

  .hero-subtitle {
    font-size: 1.25rem;
  }

  .categories-grid {
    grid-template-columns: repeat(8, 1fr);
  }

  .products-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }

  .features-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1024px) {
  .products-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
