import * as React from "react";
import { useEffect, useState } from "react";
import {
  DetailsList,
  DetailsRow,
  IColumn,
  Spinner,
  MessageBar,
  TextField,
  Stack,
  IconButton,
  DefaultButton
} from "@fluentui/react";

interface IInputs {
  dataset: ComponentFramework.PropertyTypes.DataSet;
}

interface GridProps {
  dataset: ComponentFramework.PropertyTypes.DataSet;
  context: ComponentFramework.Context<IInputs>;
}

interface RowItem {
  id: string;
  quoteNumber: string;
  companyName: string;
  email: string;
  phone: string;
  status: string;
  lob: string;
  businessType: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

interface ApiQuote {
  id: number;
  quoteNumber: string;
  companyName: string;
  email: string;
  contactNumber: string;
  status: string;
  lob: string;
  businessType: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export const Grid: React.FC<GridProps> = ({ dataset, context }) => {
  const [items, setItems] = useState<RowItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<RowItem[]>([]);
  const [pagedItems, setPagedItems] = useState<RowItem[]>([]);
  const [columns, setColumns] = useState<IColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    paginate(filteredItems);
  }, [filteredItems, page]);

  const paginate = (data: RowItem[]) => {
    const start = (page - 1) * pageSize;
    setPagedItems(data.slice(start, start + pageSize));
  };

  const getPageInfo = () => {
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, filteredItems.length);
    return `Showing ${start}-${end} of ${filteredItems.length}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        "https://nexusdev.adnic.ae/dev/quote-management/api/v1/sme-quotes/recent"
      );

      if (!res.ok) throw new Error("API failed");

      const data: ApiQuote[] = await res.json();

      const mapped: RowItem[] = data.map((item) => ({
        id: item.id.toString(),
        quoteNumber: item.quoteNumber,
        companyName: item.companyName,
        email: item.email,
        phone: item.contactNumber,
        status: item.status,
        lob: item.lob,
        businessType: item.businessType,
        updatedAt: item.updatedAt,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy
      }));

      setItems(mapped);
      setFilteredItems(mapped);
      setColumns(getColumns());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const onSearch = (text?: string) => {
    const val = text?.toLowerCase() ?? "";
    const filtered = items.filter(
      (i) =>
        i.quoteNumber.toLowerCase().includes(val) ||
        i.companyName.toLowerCase().includes(val)
    );
    setPage(1);
    setFilteredItems(filtered);
  };

  // 🔄 ITERATE API (GET)
  const iterateQuote = async (item: RowItem) => {
    try {
      const res = await fetch(
        `https://nexusdev.adnic.ae/dev/quote-management/api/v1/sme-quotes/${item.id}/iterate`,
        { method: "GET" }
      );

      if (!res.ok) throw new Error("Iteration failed");

      const response = await res.json();

      const quoteId = response?.id?.toString() || item.id;

      context.navigation.openForm({
        entityName: dataset.getTargetEntityType(),
        entityId: quoteId
      });

    } catch (error) {
      console.error("Iterate error:", error);
      alert("Failed to iterate quote");
    }
  };

  const openRecord = (item: RowItem) => {
    context.navigation.openForm({
      entityName: dataset.getTargetEntityType(),
      entityId: item.id
    });
  };

  const renderStatus = (status: string) => {
    let bg = "#e0e0e0";
    let color = "#333";

    switch (status) {
      case "DRAFT":
        bg = "#e7f1ff";
        color = "#0b5ed7";
        break;
      case "QUOTED":
        bg = "#fff4e5";
        color = "#b26a00";
        break;
      case "CUSTOMER_APPROVED":
        bg = "#e6f4ea";
        color = "#1e7e34";
        break;
    }

    return (
      <span
        style={{
          background: bg,
          color: color,
          padding: "4px 12px",
          borderRadius: "16px",
          fontSize: "12px",
          fontWeight: 500,
          minWidth: "100px",
          textAlign: "center"
        }}
      >
        {status}
      </span>
    );
  };

  const renderActions = (item: RowItem) => (
    <Stack horizontal tokens={{ childrenGap: 8 }}>
      <IconButton
        iconProps={{ iconName: "Refresh" }}
        title="Iterate Quote"
        onClick={() => iterateQuote(item)}
      />

      <IconButton
        iconProps={{ iconName: "OpenInNewWindow" }}
        title="Open"
        onClick={() => openRecord(item)}
      />

      {item.status === "CUSTOMER_APPROVED" && (
        <button
          style={{
            background: "#28a745",
            color: "#fff",
            borderRadius: "16px",
            padding: "4px 14px",
            border: "none",
            cursor: "pointer"
          }}
          onClick={() => alert(`Proceed: ${item.quoteNumber}`)}
        >
          Proceed
        </button>
      )}
    </Stack>
  );

  const getColumns = (): IColumn[] => [
    {
      key: "quoteNumber",
      name: "QUOTE NO",
      minWidth: 130,
      onRender: (item: RowItem) => (
        <span style={{ fontWeight: 600 }}>{item.quoteNumber}</span>
      )
    },
    {
      key: "companyName",
      name: "CUSTOMER NAME",
      minWidth: 150,
      onRender: (item: RowItem) => (
        <span style={{ fontWeight: 600 }}>{item.companyName}</span>
      )
    },
    { key: "email", name: "EMAIL", fieldName: "email", minWidth: 150 },
    { key: "phone", name: "PHONE NUMBER", fieldName: "phone", minWidth: 120 },
    {
      key: "status",
      name: "QUOTE STATUS",
      minWidth: 140,
      onRender: (item: RowItem) => renderStatus(item.status)
    },
    { key: "lob", name: "LOB", fieldName: "lob", minWidth: 80 },
    { key: "businessType", name: "BUSINESS TYPE", fieldName: "businessType", minWidth: 120 },
    { key: "updatedAt", name: "LAST UPDATE", fieldName: "updatedAt", minWidth: 140 },
    { key: "createdBy", name: "CREATED BY", fieldName: "createdBy", minWidth: 120 },
    { key: "updatedBy", name: "UPDATED BY", fieldName: "updatedBy", minWidth: 120 },
    {
      key: "action",
      name: "ACTION",
      minWidth: 160,
      onRender: (item: RowItem) => renderActions(item)
    }
  ];

  if (loading) return <Spinner label="Loading..." />;
  if (error) return <MessageBar>{error}</MessageBar>;

  return (
    <div style={{ padding: 10 }}>
      <Stack horizontal horizontalAlign="space-between">
        <h3>List of Quotes</h3>
        <TextField placeholder="Search" onChange={(_, v) => onSearch(v)} />
      </Stack>

      <DetailsList
        items={pagedItems}
        columns={columns}
        selectionMode={0}
        onItemInvoked={openRecord}
        onRenderRow={(props) => {
          if (!props) return null;

          const isEven = props.itemIndex % 2 === 0;

          return (
            <DetailsRow
              {...props}
              styles={{
                root: {
                  backgroundColor: isEven ? "#ffffff" : "#fafafa",
                  selectors: {
                    ":hover": {
                      backgroundColor: "#eaeaea"
                    }
                  }
                }
              }}
            />
          );
        }}
      />

      <Stack horizontal horizontalAlign="space-between" style={{ marginTop: 10 }}>
        <span style={{ fontSize: 12, color: "#666" }}>
          {getPageInfo()}
        </span>

        <Stack horizontal tokens={{ childrenGap: 10 }}>
          <DefaultButton text="Prev" disabled={page === 1} onClick={() => setPage(page - 1)} />
          <span>Page {page}</span>
          <DefaultButton
            text="Next"
            disabled={page * pageSize >= filteredItems.length}
            onClick={() => setPage(page + 1)}
          />
        </Stack>
      </Stack>
    </div>
  );
};