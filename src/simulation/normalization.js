// Normalization simulation — 1NF → 2NF → 3NF → BCNF

export const NORMAL_FORMS = ['Unnormalized', '1NF', '2NF', '3NF', 'BCNF']

// Raw denormalized table
export const RAW_TABLE = {
  name: 'Orders',
  columns: ['OrderID', 'CustomerName', 'CustomerCity', 'ProductID', 'ProductName', 'Category', 'Qty', 'Price'],
  rows: [
    ['1', 'Alice', 'London', 'P1', 'Keyboard', 'Electronics', '2', '50'],
    ['1', 'Alice', 'London', 'P2', 'Mouse',    'Electronics', '1', '25'],
    ['2', 'Bob',   'Paris',  'P1', 'Keyboard', 'Electronics', '1', '50'],
    ['3', 'Alice', 'London', 'P3', 'Desk',     'Furniture',   '1', '200'],
  ],
  violations: ['Repeating groups of products per order', 'Multi-valued columns possible'],
}

export const NORMAL_FORM_DATA = {
  Unnormalized: {
    tables: [RAW_TABLE],
    issues: [
      'Customer details repeated on every row',
      'Product details repeated whenever same product appears',
      'Deleting last order for a customer loses their city',
    ],
    fds: [],
  },

  '1NF': {
    tables: [
      {
        name: 'Orders',
        pk: ['OrderID', 'ProductID'],
        columns: ['OrderID', 'CustomerName', 'CustomerCity', 'ProductID', 'ProductName', 'Category', 'Qty', 'Price'],
        rows: [
          ['1', 'Alice', 'London', 'P1', 'Keyboard', 'Electronics', '2', '50'],
          ['1', 'Alice', 'London', 'P2', 'Mouse',    'Electronics', '1', '25'],
          ['2', 'Bob',   'Paris',  'P1', 'Keyboard', 'Electronics', '1', '50'],
          ['3', 'Alice', 'London', 'P3', 'Desk',     'Furniture',   '1', '200'],
        ],
      },
    ],
    issues: [
      'CustomerName/City depend only on OrderID (partial dependency on composite PK)',
      'ProductName/Category depend only on ProductID (partial dependency)',
    ],
    fds: [
      'OrderID → CustomerName, CustomerCity',
      'ProductID → ProductName, Category, Price',
      '{OrderID, ProductID} → Qty',
    ],
  },

  '2NF': {
    tables: [
      {
        name: 'Customers',
        pk: ['OrderID'],
        columns: ['OrderID', 'CustomerName', 'CustomerCity'],
        rows: [
          ['1', 'Alice', 'London'],
          ['2', 'Bob',   'Paris'],
          ['3', 'Alice', 'London'],
        ],
      },
      {
        name: 'Products',
        pk: ['ProductID'],
        columns: ['ProductID', 'ProductName', 'Category', 'Price'],
        rows: [
          ['P1', 'Keyboard', 'Electronics', '50'],
          ['P2', 'Mouse',    'Electronics', '25'],
          ['P3', 'Desk',     'Furniture',   '200'],
        ],
      },
      {
        name: 'OrderItems',
        pk: ['OrderID', 'ProductID'],
        columns: ['OrderID', 'ProductID', 'Qty'],
        rows: [
          ['1', 'P1', '2'],
          ['1', 'P2', '1'],
          ['2', 'P1', '1'],
          ['3', 'P3', '1'],
        ],
      },
    ],
    issues: [
      'CustomerCity depends on CustomerName (transitive dependency: OrderID → CustomerName → CustomerCity)',
    ],
    fds: [
      'CustomerName → CustomerCity  (transitive!)',
    ],
  },

  '3NF': {
    tables: [
      {
        name: 'Cities',
        pk: ['CustomerName'],
        columns: ['CustomerName', 'CustomerCity'],
        rows: [
          ['Alice', 'London'],
          ['Bob',   'Paris'],
        ],
      },
      {
        name: 'Orders',
        pk: ['OrderID'],
        columns: ['OrderID', 'CustomerName'],
        rows: [
          ['1', 'Alice'],
          ['2', 'Bob'],
          ['3', 'Alice'],
        ],
      },
      {
        name: 'Products',
        pk: ['ProductID'],
        columns: ['ProductID', 'ProductName', 'Category', 'Price'],
        rows: [
          ['P1', 'Keyboard', 'Electronics', '50'],
          ['P2', 'Mouse',    'Electronics', '25'],
          ['P3', 'Desk',     'Furniture',   '200'],
        ],
      },
      {
        name: 'OrderItems',
        pk: ['OrderID', 'ProductID'],
        columns: ['OrderID', 'ProductID', 'Qty'],
        rows: [
          ['1', 'P1', '2'],
          ['1', 'P2', '1'],
          ['2', 'P1', '1'],
          ['3', 'P3', '1'],
        ],
      },
    ],
    issues: [
      'No BCNF violations in this dataset — 3NF and BCNF are equivalent here.',
    ],
    fds: [],
  },

  BCNF: {
    tables: [
      {
        name: 'Cities',
        pk: ['CustomerName'],
        columns: ['CustomerName', 'CustomerCity'],
        rows: [['Alice', 'London'], ['Bob', 'Paris']],
      },
      {
        name: 'Orders',
        pk: ['OrderID'],
        columns: ['OrderID', 'CustomerName'],
        rows: [['1', 'Alice'], ['2', 'Bob'], ['3', 'Alice']],
      },
      {
        name: 'Products',
        pk: ['ProductID'],
        columns: ['ProductID', 'ProductName', 'Category', 'Price'],
        rows: [
          ['P1', 'Keyboard', 'Electronics', '50'],
          ['P2', 'Mouse',    'Electronics', '25'],
          ['P3', 'Desk',     'Furniture',   '200'],
        ],
      },
      {
        name: 'OrderItems',
        pk: ['OrderID', 'ProductID'],
        columns: ['OrderID', 'ProductID', 'Qty'],
        rows: [['1', 'P1', '2'], ['1', 'P2', '1'], ['2', 'P1', '1'], ['3', 'P3', '1']],
      },
    ],
    issues: [],
    fds: [],
  },
}

export const STEP_EXPLANATIONS = {
  Unnormalized: {
    explanation: 'The raw Orders table mixes customer info, product info, and order line items in one flat structure. Data is duplicated on every row.',
    why: 'Flat tables without a primary key are error-prone — the same customer city appears on multiple rows and can drift out of sync.',
  },
  '1NF': {
    explanation: '1NF: Each column holds atomic (indivisible) values and the table has a primary key — {OrderID, ProductID}.',
    why: 'A composite PK uniquely identifies each row, but CustomerName/City depend only on OrderID and ProductName/Category depend only on ProductID — these are partial dependencies violating 2NF.',
  },
  '2NF': {
    explanation: '2NF: All partial dependencies are removed. Customer data, product data, and order lines are split into separate tables.',
    why: 'Every non-key column now depends on the whole primary key, not just part of it. But CustomerCity still transitively depends on CustomerName inside the Customers table.',
  },
  '3NF': {
    explanation: '3NF: Transitive dependencies are removed. CustomerName → CustomerCity is extracted into a Cities table.',
    why: 'Every non-key attribute is now directly dependent on the primary key with no intermediate non-key column in the chain.',
  },
  BCNF: {
    explanation: 'BCNF: Every functional dependency X → Y has X as a superkey. This schema is fully normalized.',
    why: 'BCNF is stricter than 3NF — it eliminates anomalies that 3NF can miss when multiple overlapping candidate keys exist.',
  },
}
