import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, from, merge, Observable, Subject, throwError } from 'rxjs';
import { catchError, filter, map, mergeMap, scan, shareReplay, switchMap, toArray } from 'rxjs/operators';
import { ProductCategoryService } from '../product-categories/product-category.service';
import { Supplier } from '../suppliers/supplier';
import { SupplierService } from '../suppliers/supplier.service';
import { Product } from './product';



@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private productsUrl = 'api/products';
  private suppliersUrl = this.supplierService.suppliersUrl;

  products$ = this.http.get<Product[]>(this.productsUrl)
    .pipe(
      catchError(this.handleError)
    );

  productsWithCategory$ = combineLatest([
    this.products$,
    this.productCategoryService.productCategories$
  ]).pipe(
    map(([products, categories]) =>
      products.map(product => ({
        ...product,
        price: product.price * 1.5,
        category: categories.find(c => product.categoryId === c.id).name,
        searchKey: [product.productName]
      }) as Product)
    ),
    shareReplay(1)
  );

  private productSelectedSubject = new BehaviorSubject<number>(0);
  productSelectedAction$ = this.productSelectedSubject.asObservable();

  selectedProduct$ = combineLatest([
    this.productsWithCategory$,
    this.productSelectedAction$
  ])
    .pipe(
      map(([products, selectedId]) =>
        products.find(pr => pr.id === selectedId)
      ),
      shareReplay(1)
    )

  private productInsertedSubject = new Subject<Product>();
  productInsertedAction$ = this.productInsertedSubject.asObservable();

  productsWithAdd$ = merge(
    this.productsWithCategory$,
    this.productInsertedAction$
  )
    .pipe(
      scan((acc: Product[], value: Product) => [...acc, value]),
      catchError(err => {
        console.error(err);
        return throwError(err);
      })
    );

/*  selectedProductSuppliers$ = combineLatest([
    this.selectedProduct$,
    this.supplierService.suppliers$
  ]).pipe(
    map(([selectedProduct, suppliers]) =>
      suppliers.filter(supplier => selectedProduct.supplierIds.includes(supplier.id))
    )
  )*/

  selectedProductSuppliers$ = this.selectedProduct$
    .pipe(
      filter(selectedProduct => !!selectedProduct),
      switchMap(selectedProduct =>
        from(selectedProduct.supplierIds)
          .pipe(
            mergeMap(supplierId => this.http.get<Supplier>(`${this.suppliersUrl}/${supplierId}`)),
            toArray()
          )
      )
    )

  constructor(private http: HttpClient,
              private productCategoryService: ProductCategoryService,
              private supplierService: SupplierService) { }

  private handleError(err: any): Observable<never> {
    // in a real world app, we may send the server to some remote logging infrastructure
    // instead of just logging it to the console
    let errorMessage: string;
    if (err.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      errorMessage = `An error occurred: ${err.error.message}`;
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      errorMessage = `Backend returned code ${err.status}: ${err.body.error}`;
    }
    console.error(err);
    return throwError(errorMessage);
  }

  selectedProductChanged(productId) {
    this.productSelectedSubject.next(productId);
  }

  addProduct(newProduct?: Product) {
    newProduct = newProduct || this.fakeProduct();
    this.productInsertedSubject.next(newProduct);
  }

  private fakeProduct(): Product {
    return {
      id: 42,
      productName: 'Another One',
      productCode: 'TBX-0042',
      description: 'Our new product',
      price: 8.9,
      categoryId: 3,
      category: 'Toolbox',
      quantityInStock: 30
    };
  }
}
