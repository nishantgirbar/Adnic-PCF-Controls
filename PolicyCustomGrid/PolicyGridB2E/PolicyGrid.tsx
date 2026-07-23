import * as React from "react";

import {
  DetailsList,
  DetailsListLayoutMode,
  ConstrainMode,
  SelectionMode,
  DefaultButton,
  PrimaryButton,
  IconButton,
  Dropdown,
  IDropdownOption,
  Stack,
  Text,
  IColumn,
  DetailsRow,
  SearchBox,
  Spinner,
  SpinnerSize
} from "@fluentui/react";

import "./css/PolicyGrid.css";

const statusTranslations: Record<string, string> = {
  QUOTE_IN_PROGRESS: "Quote In Progress",
  QUOTE_COMPLETED: "Quote Completed",
  QUOTE_GENERATED: "Quote Generated",
  QUOTE_EXPIRED: "Expired",
  CUS_APPROVED: "Customer Approved",
  PENDING: "Pending",
  SAVED: "Saved",
  SUBMITTED: "Submitted",
  UW_REVIEW_IN_PROGRESS: "UW Review In Progress",
  UW_APPROVED: "Quote Generated",
  UW_REJECTED: "UW Rejected",
  POLICY_ISSUED: "Policy Issued",
  DRAFT: "Draft"
};

const getXrm = (): any => {
  const currentWindow = window as any;

  if (currentWindow.Xrm) return currentWindow.Xrm;
  if (currentWindow.parent?.Xrm) return currentWindow.parent.Xrm;
  if (currentWindow.top?.Xrm) return currentWindow.top.Xrm;

  throw new Error("This control must be opened inside Dynamics 365.");
};

export const PolicyGrid = ({
  data,
  pageSize,
  onNext,
  onPrev,
  onPageSizeChange,
  onSearch,
  context,
  apiBaseUrl
}: any) => {

  const [expanded, setExpanded] = React.useState<{ [key: number]: boolean }>({});
  const [uploadedFiles, setUploadedFiles] = React.useState<{ [key: number]: File | null }>({});
  const [localData, setLocalData] = React.useState<any[]>([]);
  const [loadingRow, setLoadingRow] = React.useState<{ [key: number]: boolean }>({});
  const [search, setSearch] = React.useState("");
  const [quoteStatus, setQuoteStatus] = React.useState("");
  const [lastSearchKey, setLastSearchKey] = React.useState("");

  // 🔥 GLOBAL LOADER

  const [isLoading, setIsLoading] = React.useState(false);

  const fileRefs = React.useRef<{ [key: number]: HTMLInputElement | null }>({});

  // 🔥 SET DATA

 React.useEffect(() => {

  setLocalData([]);
  setExpanded({});
  setUploadedFiles({});

  const rows = data?.content || [];
  if (rows.length === 0) {
    setIsLoading(false);
    return;
  }

  setIsLoading(true);

  const loadCRMAvailability = async () => {

    const updatedRows = await Promise.all(

      rows.map(async (row: any) => {

        const exists =
          await checkQuoteExists(
            row.quoteNumber
          );

        return {
          ...row,
          isAvailableInCRM: exists
        };
      })
    );

    setLocalData(updatedRows);

    setIsLoading(false);
  };

  loadCRMAvailability();

}, [data]);

  // 🔥 INITIAL LOADER

  React.useEffect(() => {

    setIsLoading(!data);

  }, [data]);

  // 🔥 STATUS TEXT

  const getStatusText = (status: string) => {

    if (!status) return "";

    const normalizedStatus = status.trim().toUpperCase();

    return statusTranslations[normalizedStatus] || status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  // 🔥 STATUS STYLE

const getStatusStyle = (status: string): React.CSSProperties => {

  const value = (status || "").toUpperCase();

  if (value.includes("QUOT")) {

    return {
      backgroundColor: "#abd6e6",
      color: "#10197c",
      padding: "4px 12px",
      borderRadius: 16,
      fontWeight: 600
    };
  }

  if (value.includes("SUBMIT")) {

    return {
      backgroundColor: "#99dfc6",
      color: "#0f6c55",
      padding: "4px 12px",
      borderRadius: 16,
      fontWeight: 600
    };
  }

  if (
    value.includes("APPROV") ||
    value.includes("CUS_APPROVED")
  ) {

    return {
      backgroundColor: "#dff6dd",
      color: "#107c10",
      padding: "4px 12px",
      borderRadius: 16,
      fontWeight: 600
    };
  }

  if (value.includes("PROGRESS")) {

    return {
      backgroundColor: "#fff4ce",
      color: "#8a6d1d",
      padding: "4px 12px",
      borderRadius: 16,
      fontWeight: 600
    };
  }

  return {
    backgroundColor: "#f3f2f1",
    color: "#605e5c",
    padding: "4px 12px",
    borderRadius: 16
  };
};
  // 🔥 OPEN MAIN QUOTE FORM

  const openMainQuoteForm = async (item: any) => {

    try {

      setIsLoading(true);

      const safe =
        (item.quoteNumber || "")
          .replace(/'/g, "''");

      console.log('safe', safe);

      const res =
        await context.webAPI.retrieveMultipleRecords(
          "adnic_quote",
          `?$select=adnic_quoteid&$filter=adnic_quotenumber eq '${safe}'`
        );

      const id =
        res.entities?.[0]?.adnic_quoteid;

      if (!id) {

        setIsLoading(false);

        return alert("Quote not found");
      }

      const normalizedStatus = (item.status || "")
        .toString()
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_");

      const formId = normalizedStatus.includes("UW_REVIEW_IN_PROGRESS")
        ? "3abb9f29-a347-f111-bec6-70a8a522d03b"
        : normalizedStatus.includes("QUOTE_IN_PROGRESS")
          ? "b80c4b15-3f4f-f111-bec6-7ced8dac4d08"
          : "9a954027-cc2c-f111-8342-6045bd150384";

      await getXrm().Navigation.openForm({
        entityName: "adnic_quote",
        entityId: id,
        formId,
        openInNewWindow: false
      });
      

    } catch (e) {

      console.error(e);

      alert("Unable to open quote");

    } finally {

      setIsLoading(false);
    }
  };

  const checkQuoteExists = async (
  quoteNumber: string
): Promise<boolean> => {

  try {

    const safe =
      (quoteNumber || "")
        .replace(/'/g, "''");

    const res =
      await context.webAPI.retrieveMultipleRecords(
        "adnic_quote",
        `?$select=adnic_quoteid&$filter=adnic_quotenumber eq '${safe}'`
      );

    return (res.entities?.length || 0) > 0;

  } catch {

    return false;
  }
}; 

  // 🔥 ITERATION + OPEN FORM

  const openQuoteEdit = async (item: any) => {

    try {

      setIsLoading(true);

      const iterateUrl = `${apiBaseUrl}/quote-management/api/v1/sme-quotes/${item.id}/iterate`;

      console.log('iterateUrl', iterateUrl);

      const iterationRes = await fetch(iterateUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      if (!iterationRes.ok) {

        throw new Error("Iteration API failed");
      }

      const iterationResult = await iterationRes.json();

      const latestQuoteNumber =
        iterationResult?.quoteNumber;

      const safe =
        (latestQuoteNumber || "")
          .replace(/'/g, "''");

      const res =
        await context.webAPI.retrieveMultipleRecords(
          "adnic_quote",
          `?$select=adnic_quoteid&$filter=adnic_quotenumber eq '${item.quoteNumber}'`
        );

      const id =
        res.entities?.[0]?.adnic_quoteid;

      if (!id) {

        setIsLoading(false);

        return alert("Quote not found");
      }

       await context.webAPI.updateRecord(
          "adnic_quote",
          id,
          {
            adnic_quotenumber : latestQuoteNumber
          }
        );

      (window.top as any).Xrm.Navigation.openForm({
        entityName: "adnic_quote",
        entityId: id
      });

    } catch (e) {

      console.error(e);

      alert("Iteration failed");

    } finally {

      setIsLoading(false);
    }
  };

  // 🔥 OPEN DIALOG

const openQuoteViewDialog = async (item: any) => {

  try {

    setIsLoading(true);

    const safe =
      (item.quoteNumber || "")
        .replace(/'/g, "''");

    const res =
      await context.webAPI.retrieveMultipleRecords(
        "adnic_quote",
        `?$select=adnic_quoteid&$filter=adnic_quotenumber eq '${safe}'`
      );

    const id =
      res.entities?.[0]?.adnic_quoteid;

    if (!id) {

      setIsLoading(false);

      return alert("Quote not found");
    }

    // 🔥 READ ONLY FORM ID

    const readOnlyFormId =
      "b80c4b15-3f4f-f111-bec6-7ced8dac4d08";

    (context.navigation as any).navigateTo(
      {
        pageType: "entityrecord",
        entityName: "adnic_quote",
        entityId: id,
        formId: readOnlyFormId
      },
      {
        target: 2,
        width: { value: 80, unit: "%" },
        height: { value: 80, unit: "%" }
      }
    );

  } finally {

    setIsLoading(false);
  }
};

  // 🔥 NAVIGATE POLICY

  const navigateToPolicy = (item: any) => {

    (window.top as any).Xrm.Navigation.openForm(
      {
        entityName: "adnic_policy"
      },
      {
        adnic_name: item.quoteNumber,
        adnic_quoteid_param: item.id
      }
    );
  };

  // 🔥 API - UPLOAD

  const uploadSignedQuote = async (
    quoteId: number,
    memberId: number,
    file: File
  ) => {

    const formData = new FormData();

    formData.append("file", file);

    const res = await fetch(
      `${apiBaseUrl}/quote-management/api/v1/sme-quotes/${quoteId}/upload-signed-quote?memberId=${memberId}`,
      {
        method: "POST",
        body: formData
      }
    );

    if (!res.ok) {

      throw new Error("Upload failed");
    }

    return await res.json();
  };

  // 🔥 API - APPROVE

  const approveQuote = async (quoteId: number) => {

  const res = await fetch(
    `${apiBaseUrl}/quote-management/api/v1/sme-quotes/${quoteId}/approve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          comment: "Approved via UI",
          commentType: "CUSTOMER"
        })
      }
    );

    if (!res.ok) {

      throw new Error("Approval failed");
    }

    return await res.json();
  };

  // 🔥 FILE UPLOAD

  const handleFileUpload = async (
    id: number,
    item: any,
    e: any
  ) => {

    const file = e.target.files?.[0];

    if (!file) return;

    const memberId = item?.members?.[0]?.id;

    if (!memberId) {

      return alert("Member ID not found");
    }

    try {

      setIsLoading(true);

      setLoadingRow(prev => ({
        ...prev,
        [id]: true
      }));

      await uploadSignedQuote(id, memberId, file);

      await approveQuote(id);

      setUploadedFiles(prev => ({
        ...prev,
        [id]: file
      }));

      setLocalData(prev =>
        prev.map(row =>
          row.id === id
            ? { ...row, status: "CUS_APPROVED" }
            : row
        )
      );

      setExpanded(prev => ({
        ...prev,
        [id]: false
      }));

    } catch {

      alert("Upload or approval failed");

    } finally {

      setLoadingRow(prev => ({
        ...prev,
        [id]: false
      }));

      setIsLoading(false);
    }
  };

  // 🔥 DELETE FILE

  const handleDelete = (id: number) => {

    setUploadedFiles(prev => ({
      ...prev,
      [id]: null
    }));
  };

  // 🔥 EXPAND COLLAPSE

  const toggle = (id: number) => {

    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // 🔥 BUILD GRID ITEMS

  const items: any[] = [];

  localData.forEach((q: any) => {
    const id = q.id;

    items.push({
      ...q,
      key: id,
      id,
      isUpload: false
    });

    if (expanded[id] && q.status !== "CUS_APPROVED") {
      items.push({
        key: id + "_upload",
        parentId: id,
        isUpload: true
      });
    }
  });

  // 🔥 PAGE SIZE

  const pageSizeOptions: IDropdownOption[] = [

    { key: 10, text: "10" },
    { key: 20, text: "20" },
    { key: 50, text: "50" }
  ];

  const quoteStatusOptions: IDropdownOption[] = [
    { key: "", text: "All Quote Statuses" },
    ...Object.keys(statusTranslations).map(status => ({
      key: status,
      text: statusTranslations[status]
    }))
  ];

  // 🔥 COLUMNS

  const columns: IColumn[] = [

    {
      key: "expand",
      name: "",
      minWidth: 40,
      maxWidth: 40,

      onRender: (item: any) =>

        item.isUpload || !(item.status || "").toUpperCase().includes("GENERATED")

          ? null

          : (
            <span
              onClick={() => toggle(item.id)}
              style={{ cursor: "pointer" }}
            >
              {expanded[item.id] ? "▼" : "▶"}
            </span>
          )
    },

    // 🔥 QUOTE LINK

    {
      key: "quote",
      name: "Quote No",
      fieldName: "quoteNumber",
      minWidth: 110,
      maxWidth: 150,
      isResizable: true,
      onRender: (item: any) => {
        const isAvailable = item.isAvailableInCRM;

        return (
          <span
            onClick={() => {
              if (isAvailable) {
                openMainQuoteForm(item);
              }
            }}
            style={{
              cursor: isAvailable ? "pointer" : "default",
              color: isAvailable ? "#0F6CBD" : "#A19F9D",
              textDecoration: isAvailable ? "underline" : "none",
              opacity: isAvailable ? 1 : 0.6
            }}
          >
            {item.quoteNumber}
          </span>
        );
      }
    },

    {
      key: "name",
      name: "Customer Name",
      fieldName: "companyName",
      minWidth: 110,
      maxWidth: 180,
      isMultiline: true,
      isResizable: true
    },
    
    {
      key: "email",
      name: "Email",
      fieldName: "email",
      minWidth: 130,
      maxWidth: 220,
      isMultiline: true,
      isResizable: true
    },
    {
      key: "phoneNumber",
      name: "Phone Number",
      fieldName: "contactNumber",
      minWidth: 90,
      maxWidth: 130,
      isResizable: true
    },
    {
      key: "quotestatus",
      name: "Quote Status",
      minWidth: 140,
      maxWidth: 190,
      isResizable: true,


      
      onRender: (item: any) =>

        item.isUpload

          ? null

          : (
            <span style={getStatusStyle(item.status)}>
              {getStatusText(item.status)}
            </span>
          )
    },
    {
      key: "iob",
      name: "LOB",
      fieldName: "sourceOfBusiness",
      minWidth: 60,
      maxWidth: 90,
      isResizable: true
    },
    {
      key: "updatedDate",
      name: "Last Update",
      minWidth: 70,
      maxWidth: 110,
      isResizable: true,

      onRender: (item: any) => {

        if (!item.updatedAt) {

          return "-";
        }

        const date =
          new Date(item.updatedAt);

        return (
          <span>
            {date.toLocaleDateString()}
          </span>
        );
      }
    },
    {
      key: "createdby",
      name: "Created By",
      fieldName: "createdBy",
      minWidth: 70,
      maxWidth: 130,
      isMultiline: true,
      isResizable: true
    },
    {
        key: "action",
        name: "Action",
        minWidth: 150,
        maxWidth: 220,

        onRender: (item: any) => {

          if (item.isUpload) {

            return null;
          }

          const isAvailable =
            item.isAvailableInCRM;

          // 🔥 ITERATE ONLY FOR GENERATED STATUS

          const canIterate =
            isAvailable &&
           ((item.status || "")
              .toUpperCase()
              .includes("GENERATED") ||
              (item.status || "")
              .toUpperCase()
              .includes("REVIEW"));

          return (

            <Stack horizontal tokens={{ childrenGap: 8 }}>

              {/* 🔥 ITERATE */}

              <IconButton
                iconProps={{ iconName: "Refresh" }}

                disabled={!canIterate}

                title={
                  !isAvailable
                    ? "Quote not available in CRM"
                    : !canIterate
                    ? "Iteration allowed only for Generated quotes"
                    : "Iterate Quote"
                }

                styles={{
                  root: {
                    opacity: canIterate ? 1 : 0.5
                  }
                }}

                onClick={() => {

                  if (canIterate) {

                    openQuoteEdit(item);
                  }
                }}
              />

              {/* 🔥 VIEW QUOTE */}

              <IconButton
                iconProps={{ iconName: "TextDocument" }}
  

                title={
                  isAvailable
                    ? "View Quote"
                    : "Quote not available in CRM"
                }

                styles={{
                  root: {
                    opacity: isAvailable ? 1 : 0.5
                  }
                }}

                onClick={() => {

                  if (isAvailable) {

                    openQuoteViewDialog(item);
                  }
                }}
              />

              {/* 🔥 PROCEED */}

              {item.status === "CUS_APPROVED" && (

                <PrimaryButton
                  text="Proceed"

                  onClick={() => navigateToPolicy(item)}

                  styles={{
                    root: {
                      backgroundColor: "#107c10",
                      borderColor: "#107c10",
                      height: 28
                    },

                    rootHovered: {
                      backgroundColor: "#0b6a0b",
                      borderColor: "#0b6a0b"
                    }
                  }}
                />
              )}
            </Stack>
          );
        }
      }
  ];

  const referenceColumns: IColumn[] = [
    {
      key: "quote",
      name: "QUOTE NO",
      fieldName: "quoteNumber",
      minWidth: 130,
      maxWidth: 170,
      isResizable: true,
      onRender: (item: any) => {
        const isAvailable = item.isAvailableInCRM;
        return (
          <span
            className={isAvailable ? "pcf-quote-link" : "pcf-quote-link-disabled"}
            onClick={() => isAvailable && openMainQuoteForm(item)}
          >
            {item.quoteNumber}
          </span>
        );
      }
    },
    {
      key: "name",
      name: "NAME",
      fieldName: "companyName",
      minWidth: 140,
      maxWidth: 200,
      isMultiline: true,
      isResizable: true
    },
    {
      key: "status",
      name: "STATUS",
      minWidth: 150,
      maxWidth: 210,
      isResizable: true,
      onRender: (item: any) => (
        <span style={getStatusStyle(item.status)}>
          {getStatusText(item.status)}
        </span>
      )
    },
    {
      key: "product",
      name: "PRODUCT",
      fieldName: "sourceOfBusiness",
      minWidth: 85,
      maxWidth: 120,
      isResizable: true
    },
    {
      key: "quoteDate",
      name: "QUOTE DATE",
      minWidth: 105,
      maxWidth: 130,
      isResizable: true,
      onRender: (item: any) => {
        const value = item.createdAt || item.updatedAt;
        return value ? new Date(value).toLocaleDateString() : "-";
      }
    },
    {
      key: "uploadSignedQuote",
      name: "UPLOAD SIGNED QUOTE",
      minWidth: 130,
      maxWidth: 150,
      onRender: (item: any) => {
        const canUpload = (item.status || "").toUpperCase().includes("GENERATED");
        return (
          <div className="pcf-icon-cell">
            <IconButton
              iconProps={{ iconName: "CloudUpload" }}
              disabled={!canUpload || Boolean(loadingRow[item.id])}
              title={canUpload ? "Upload signed quote" : "Available for generated quotes"}
              ariaLabel="Upload signed quote"
              onClick={() => {
                if (canUpload && !loadingRow[item.id]) {
                  fileRefs.current[item.id]?.click();
                }
              }}
            />
            <input
              type="file"
              ref={(element) => {
                fileRefs.current[item.id] = element;
              }}
              className="pcf-hidden-file-input"
              onChange={(event) => {
                handleFileUpload(item.id, item, event);
                event.currentTarget.value = "";
              }}
            />
          </div>
        );
      }
    },
    {
      key: "viewSignedQuote",
      name: "VIEW SIGNED QUOTE",
      minWidth: 125,
      maxWidth: 145,
      onRender: (item: any) => (
        <div className="pcf-icon-cell">
          <IconButton
            iconProps={{ iconName: "TextDocument" }}
            disabled={!item.isAvailableInCRM}
            title={item.isAvailableInCRM ? "View signed quote" : "Quote not available in CRM"}
            ariaLabel="View signed quote"
            onClick={() => item.isAvailableInCRM && openQuoteViewDialog(item)}
          />
        </div>
      )
    },
    {
      key: "iterateQuotes",
      name: "ITERATE QUOTES",
      minWidth: 115,
      maxWidth: 135,
      onRender: (item: any) => {
        const status = (item.status || "").toUpperCase();
        const canIterate =
          item.isAvailableInCRM &&
          (status.includes("GENERATED") || status.includes("REVIEW"));
        return (
          <div className="pcf-icon-cell">
            <IconButton
              iconProps={{ iconName: "Refresh" }}
              disabled={!canIterate}
              title={canIterate ? "Iterate quote" : "Iteration is not available"}
              ariaLabel="Iterate quote"
              onClick={() => canIterate && openQuoteEdit(item)}
            />
          </div>
        );
      }
    },
    {
      key: "actions",
      name: "ACTIONS",
      minWidth: 85,
      maxWidth: 100,
      onRender: (item: any) => {
        const canProceed = item.status === "CUS_APPROVED";
        return (
          <div className="pcf-icon-cell">
            <IconButton
              iconProps={{ iconName: "ChevronRightMed" }}
              disabled={!canProceed}
              title={canProceed ? "Proceed" : "Available after customer approval"}
              ariaLabel="Proceed"
              onClick={() => canProceed && navigateToPolicy(item)}
            />
          </div>
        );
      }
    },
    {
      key: "activityLog",
      name: "ACTIVITY LOG",
      minWidth: 95,
      maxWidth: 115,
      onRender: (item: any) => (
        <div className="pcf-icon-cell">
          <IconButton
            iconProps={{ iconName: "History" }}
            disabled={!item.isAvailableInCRM}
            title={item.isAvailableInCRM ? "Open quote activity" : "Quote not available in CRM"}
            ariaLabel="Activity log"
            onClick={() => item.isAvailableInCRM && openMainQuoteForm(item)}
          />
        </div>
      )
    }
  ];

  const getSearchKey = (query: string, status: string) =>
    `${(query || "").trim()}|${status || ""}`;

  const triggerSearch = async (query: string, status: string) => {
    const trimmed = (query || "").trim();
    const nextSearchKey = getSearchKey(trimmed, status);

    if (nextSearchKey === lastSearchKey) {
      return;
    }

    setLastSearchKey(nextSearchKey);
    setIsLoading(true);
    await onSearch(trimmed, status);
    setIsLoading(false);
  };

  const clearSearch = () => {
    setSearch("");
    setQuoteStatus("");
    triggerSearch("", "");
  };

  return (

    <Stack className="pcf-policy-grid">

      {/* 🔥 SEARCH */}

      <Stack className="pcf-search-container" horizontal tokens={{ childrenGap: 8 }}>
        <SearchBox
          className="pcf-search-box"
          placeholder="Search by Quote No, Customer Name, Email or LOB"
          value={search}
          onChange={(_, value) => setSearch(value || "")}
          onClear={clearSearch}
          onSearch={() => {
            triggerSearch(search, quoteStatus);
          }}
        />

        <Dropdown
          className="pcf-status-filter"
          placeholder="Quote Status"
          selectedKey={quoteStatus}
          options={quoteStatusOptions}
          onChange={(_, option) => setQuoteStatus(String(option?.key || ""))}
        />

        <DefaultButton
          text="Search"
          disabled={getSearchKey(search, quoteStatus) === lastSearchKey}
          onClick={() => {
            triggerSearch(search, quoteStatus);
          }}
          styles={{
            root: {
              minWidth: 90
            }
          }}
        />
      </Stack>

      {/* 🔥 GRID */}

      <Stack
        className="pcf-grid-region"
        style={{
          position: "relative"
        }}
      >

        {/* 🔥 GLOBAL SPINNER */}

        {isLoading && (

          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(255,255,255,0.7)",
              zIndex: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Spinner
              label="Loading..."
              size={SpinnerSize.large}
            />
          </div>
        )}

        <div className="pcf-crm-grid">
          <DetailsList
            items={items}
            columns={referenceColumns}
            getKey={(item) => String(item.key)}
            selectionMode={SelectionMode.none}
            layoutMode={DetailsListLayoutMode.justified}
            constrainMode={ConstrainMode.unconstrained}
            compact={true}
            styles={{
              root: {
                border: "1px solid #d2d2d2",
                borderRadius: 4,
                background: "#fff"
              }
            }}
            onRenderRow={(props) => {

            if (!props) return null;

            const item: any = props.item;

            if (item.isUpload) {

              return (

                <div style={{ padding: 10 }}>

                  <Stack horizontal tokens={{ childrenGap: 10 }}>

                    <Text>
                      📎 Upload Customer Signed Quote
                    </Text>

                    {loadingRow[item.parentId]

                      ? <Text>Uploading...</Text>

                      : uploadedFiles[item.parentId]

                      ? (
                        <>
                          <Text>
                            {uploadedFiles[item.parentId]?.name}
                          </Text>

                          <DefaultButton
                            text="Delete"
                            onClick={() => handleDelete(item.parentId)}
                          />
                        </>
                      )

                      : (
                        <>
                          <DefaultButton
                            onClick={() =>
                              fileRefs.current[item.parentId]?.click()
                            }
                            text="Upload"
                          />

                          <input
                            type="file"
                            ref={(el) => {
                              fileRefs.current[item.parentId] = el;
                            }}
                            style={{ display: "none" }}
                            onChange={(e) => {

                              const parentItem =
                                localData.find(
                                  x => x.id === item.parentId
                                );

                              handleFileUpload(
                                item.parentId,
                                parentItem,
                                e
                              );
                            }}
                          />
                        </>
                      )}
                  </Stack>
                </div>
              );
            }

            return <DetailsRow {...props} />;
            }}
          />
        </div>
      </Stack>

      {/* 🔥 FOOTER */}

      <Stack
        className="pcf-grid-footer"
        horizontal
        horizontalAlign="space-between"
        style={{ padding: 10 }}
      >

        <DefaultButton
          text="Previous"
          onClick={onPrev}
          disabled={data?.number === 0}
        />

        <Stack
          horizontal
          tokens={{ childrenGap: 10 }}
          verticalAlign="center"
        >

          <Text>
            Page {data?.number + 1} of {data?.totalPages}
          </Text>

          <Dropdown
            selectedKey={pageSize}
            options={pageSizeOptions}
            onChange={(_, o) =>
              onPageSizeChange(Number(o?.key))
            }
            styles={{
              root: {
                width: 80
              }
            }}
          />
        </Stack>

        <DefaultButton
          text="Next"
          onClick={onNext}
          disabled={data?.number === data?.totalPages - 1}
        />
      </Stack>
    </Stack>
  );
}
