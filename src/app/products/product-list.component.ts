import { Component } from '@angular/core';
import { combineLatest, EMPTY, Subject } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import { ProductCategoryService } from '../product-categories/product-category.service';
import { ProductService } from './product.service';

@Component({
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent {

  private categorySelectedSubject = new Subject<number>();

  pageTitle = 'Product List';
  errorMessage = '';
  categories;

  categorySelectedAction$ = this.categorySelectedSubject.asObservable()
    .pipe(startWith(0));

  products$ = combineLatest([
    this.productService.productsWithCategory$,
    this.categorySelectedAction$
  ]).pipe(
    map(([products, selectedCategoryId]) =>
      products.filter(product =>
        selectedCategoryId ? product.categoryId === selectedCategoryId : true)
    ),
    catchError(err => {
      this.errorMessage = err;
      return EMPTY;
    })
  );
  
  categories$ = this.productCategoryService.productCategories$
    .pipe(
      catchError(err => {
        this.errorMessage = err;
        return EMPTY;
      })
    );
  
  productsSimpleFilter$ = combineLatest([
    this.products$,
    this.categorySelectedAction$
  ]).pipe(
    map(([products, selectedCategoryId]) =>
      products.filter(product =>
        selectedCategoryId ? product.categoryId === selectedCategoryId : true)
    )
  )

  constructor(private productService: ProductService,
    private productCategoryService: ProductCategoryService) { }

  onAdd(): void {
    console.log('Not yet implemented');
  }

  onSelected(categoryId: string): void {
    this.categorySelectedSubject.next(+categoryId);
  }
}
