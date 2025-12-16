import './Table.css';

const Table = ({ children, className = '' }) => {
  return (
    <div className="table-wrapper">
      <table className={`table ${className}`}>
        {children}
      </table>
    </div>
  );
};

const TableHeader = ({ children }) => {
  return <thead className="table-header">{children}</thead>;
};

const TableBody = ({ children }) => {
  return <tbody className="table-body">{children}</tbody>;
};

const TableRow = ({ children, className = '' }) => {
  return <tr className={`table-row ${className}`}>{children}</tr>;
};

const TableHead = ({ children, className = '' }) => {
  return <th className={`table-head ${className}`}>{children}</th>;
};

const TableCell = ({ children, className = '' }) => {
  return <td className={`table-cell ${className}`}>{children}</td>;
};

Table.Header = TableHeader;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Head = TableHead;
Table.Cell = TableCell;

export default Table;
