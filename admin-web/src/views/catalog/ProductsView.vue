<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { adminApi } from '@/api/admin';
import type { CategoryItem, ProductItem, PaginationResponse } from '@/types/api';

const loading = ref(false);
const saving = ref(false);
const products = ref<ProductItem[]>([]);
const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive<{ search?: string; categoryId?: string; isActive?: boolean | undefined }>({});
const categories = ref<CategoryItem[]>([]);

const modalOpen = ref(false);
const editing = ref<ProductItem | null>(null);
const formState = reactive<any>({
	slug: '',
	title: '',
	categoryId: '',
	description: '',
	mediaUrl: '',
	priceMapText: 'USD:9.99',
	defaultCurrency: 'USD',
	stock: 0,
	deliveryMode: 'code',
	deliveryInstructions: '',
	sort: 0,
	isActive: true,
});

function resetForm() {
	Object.assign(formState, {
		slug: '',
		title: '',
		categoryId: '',
		description: '',
		mediaUrl: '',
		priceMapText: 'USD:9.99',
		defaultCurrency: 'USD',
		stock: 0,
		deliveryMode: 'code',
		deliveryInstructions: '',
		sort: 0,
		isActive: true,
	});
	editing.value = null;
}

async function fetchCategories() {
	try {
		const res = await adminApi.listCategories();
		categories.value = res.items || [];
	} catch (error) {
		// ignore
	}
}

async function fetchProducts() {
	loading.value = true;
	try {
		const res: PaginationResponse<ProductItem> = await adminApi.listProducts({
			page: pagination.page,
			pageSize: pagination.pageSize,
			search: query.search,
			categoryId: query.categoryId,
			isActive: query.isActive,
		});
		products.value = res.items || [];
		pagination.total = res.total ?? 0;
	} catch (error: any) {
		message.error(error?.message || '加载商品失败');
	} finally {
		loading.value = false;
	}
}

watchEffect(fetchProducts);
fetchCategories();

function openCreate() {
	resetForm();
	modalOpen.value = true;
}

function openEdit(record: ProductItem) {
	editing.value = record;
	Object.assign(formState, record, {
		priceMapText: Object.entries(record.priceMap || {})
			.map(([k, v]) => `${k}:${v}`)
			.join(', '),
	});
	modalOpen.value = true;
}

function parsePriceMap(text: string) {
	const result: Record<string, number> = {};
	text
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.forEach((pair) => {
			const [currency, value] = pair.split(':');
			if (currency && value) result[currency.trim()] = Number(value);
		});
	return result;
}

async function handleSubmit() {
	saving.value = true;
	try {
		const payload = {
			...formState,
			priceMap: parsePriceMap(formState.priceMapText || ''),
		};
		if (editing.value) {
			await adminApi.updateProduct(editing.value.id, payload);
			message.success('更新成功');
		} else {
			await adminApi.createProduct(payload);
			message.success('创建成功');
		}
		modalOpen.value = false;
		fetchProducts();
	} catch (error: any) {
		message.error(error?.message || '保存失败');
	} finally {
		saving.value = false;
	}
}

async function handleToggle(record: ProductItem) {
	await adminApi.toggleProductStatus(record.id, !(record.isActive === false));
	message.success('状态已更新');
	fetchProducts();
}
</script>

<template>
	<div>
		<div style="margin-bottom: 16px">
			<a-space>
				<a-button type="default" @click="fetchProducts">刷新</a-button>
				<a-button type="primary" @click="openCreate">新建商品</a-button>
			</a-space>
		</div>
		<a-space style="margin-bottom: 12px" :size="8">
			<a-input v-model:value="query.search" allow-clear placeholder="搜索标题或描述" style="width: 220px" />
			<a-select v-model:value="query.categoryId" allow-clear placeholder="分类" style="width: 180px">
				<a-select-option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
			</a-select>
			<a-select v-model:value="query.isActive" allow-clear placeholder="状态" style="width: 140px">
				<a-select-option :value="true">已启用</a-select-option>
				<a-select-option :value="false">已停用</a-select-option>
			</a-select>
		</a-space>

		<a-table
			:data-source="products"
			:pagination="{ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total, onChange: (p, ps) => { pagination.page = p; pagination.pageSize = ps; fetchProducts(); } }"
			:loading="loading"
			row-key="id"
		>
			<a-table-column title="标题" data-index="title" key="title" />
			<a-table-column title="分类" key="categoryId">
				<template #default="{ record }">
					{{ categories.find((c) => c.id === record.categoryId)?.name || '-' }}
				</template>
			</a-table-column>
			<a-table-column title="售价" key="priceMap">
				<template #default="{ record }">
					<div v-for="(price, currency) in record.priceMap" :key="currency">{{ currency }} {{ price }}</div>
				</template>
			</a-table-column>
			<a-table-column title="库存" data-index="stock" key="stock" />
			<a-table-column title="状态" key="isActive">
				<template #default="{ record }">
					<a-tag :color="record.isActive === false ? 'red' : 'green'">{{ record.isActive === false ? '停用' : '在售' }}</a-tag>
				</template>
			</a-table-column>
			<a-table-column title="操作" key="actions">
				<template #default="{ record }">
					<a-space>
						<a-button type="link" @click="openEdit(record)">编辑</a-button>
						<a-switch :checked="record.isActive !== false" @change="() => handleToggle(record)" />
					</a-space>
				</template>
			</a-table-column>
		</a-table>

		<a-modal v-model:open="modalOpen" :title="editing ? '编辑商品' : '新建商品'" :confirm-loading="saving" @ok="handleSubmit" width="720px">
			<a-form layout="vertical">
				<a-row :gutter="12">
					<a-col :span="12">
						<a-form-item label="标识 slug">
							<a-input v-model:value="formState.slug" placeholder="唯一英文标识" />
						</a-form-item>
					</a-col>
					<a-col :span="12">
						<a-form-item label="标题">
							<a-input v-model:value="formState.title" placeholder="商品标题" />
						</a-form-item>
					</a-col>
				</a-row>
				<a-row :gutter="12">
					<a-col :span="12">
						<a-form-item label="分类">
							<a-select v-model:value="formState.categoryId" placeholder="选择分类">
								<a-select-option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
							</a-select>
						</a-form-item>
					</a-col>
					<a-col :span="12">
						<a-form-item label="排序">
							<a-input-number v-model:value="formState.sort" style="width: 100%" />
						</a-form-item>
					</a-col>
				</a-row>
				<a-form-item label="价格(格式: USD:9.9, EUR:8.9)">
					<a-input v-model:value="formState.priceMapText" />
				</a-form-item>
				<a-row :gutter="12">
					<a-col :span="12">
						<a-form-item label="默认币种">
							<a-input v-model:value="formState.defaultCurrency" />
						</a-form-item>
					</a-col>
					<a-col :span="12">
						<a-form-item label="库存">
							<a-input-number v-model:value="formState.stock" style="width: 100%" />
						</a-form-item>
					</a-col>
				</a-row>
				<a-row :gutter="12">
					<a-col :span="12">
						<a-form-item label="发货方式">
							<a-select v-model:value="formState.deliveryMode">
								<a-select-option value="code">卡密自动发货</a-select-option>
								<a-select-option value="text">文本说明</a-select-option>
								<a-select-option value="manual">人工处理</a-select-option>
							</a-select>
						</a-form-item>
					</a-col>
					<a-col :span="12">
						<a-form-item label="状态">
							<a-switch v-model:checked="formState.isActive" checked-children="上架" un-checked-children="下架" />
						</a-form-item>
					</a-col>
				</a-row>
				<a-form-item label="封面图 URL">
					<a-input v-model:value="formState.mediaUrl" placeholder="https://" />
				</a-form-item>
				<a-form-item label="描述">
					<a-textarea v-model:value="formState.description" rows="3" />
				</a-form-item>
			<a-form-item label="发货说明">
				<a-textarea v-model:value="formState.deliveryInstructions" rows="3" />
			</a-form-item>
		</a-form>
	</a-modal>
	</div>
</template>