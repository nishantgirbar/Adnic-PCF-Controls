import * as React from "react";
import {
    Stack,
    Text,
    Toggle,
    PrimaryButton,
    DefaultButton,
    TextField,
    Spinner,
    SpinnerSize
} from "@fluentui/react";

import "./style.css";

interface Member {
    id: number;
    serialNo?: number;
    relation: string;
    gender: string;
    dob: string;
    salary: string;
    visa: string;
    category: string;
    marital: string;
    comments?: string;
    files?: {
        id?: string;
        annotationId?: string;
        name: string;
        mimeType?: string;
        size?: number;
    }[];
    error?: string;
    uploadError?: string;
}

interface Question {
    id: number;
    question: string;
    displayOrder: number;
    answer: boolean;
    category: string;
}

const EXCLUDED_QUESTION = "restrict purchase orders";

const MedicalControlUI = ({
    apiUrl,
    onChange,
    isDisabled,
    existingData,
    pcfContext
}: any) => {

    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
    const MAX_FILES_PER_MEMBER = 5;

    const isAllowedFile = (file: File): boolean => {
        const fileName = file.name.toLowerCase();

        return (
            fileName.endsWith(".pdf") ||
            fileName.endsWith(".jpg") ||
            fileName.endsWith(".jpeg") ||
            fileName.endsWith(".png")
        );
    };

    const normalizeFileName = (fileName: string): string =>
        fileName.trim().toLocaleLowerCase();

    const createBlankMember = (): Member => ({

        id: Date.now() + Math.floor(Math.random() * 1000),
        relation: "",
        gender: "",
        dob: "",
        salary: "",
        visa: "",
        category: "",
        marital: "",
        comments: "",
        files: [],
        error: "",
        uploadError: ""
    });

    const clearMemberValues = (
        member: Member,
        serialNo?: number,
        error = ""
    ): Member => ({

        ...member,
        serialNo,
        relation: "",
        gender: "",
        dob: "",
        salary: "",
        visa: "",
        category: "",
        marital: "",
        comments: "",
        files: [],
        error,
        uploadError: ""
    });

    const formatDob = (value?: string): string => {

        if (!value) return "";

        const raw =
            value.toString().trim();

        const alreadyFormatted =
            raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

        if (alreadyFormatted) {
            return raw;
        }

        const isoDate =
            raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

        if (isoDate) {
            return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
        }

        const parsedDate =
            new Date(raw);

        if (Number.isNaN(parsedDate.getTime())) {
            return raw;
        }

        const day =
            parsedDate.getDate().toString().padStart(2, "0");

        const month =
            (parsedDate.getMonth() + 1).toString().padStart(2, "0");

        const year =
            parsedDate.getFullYear();

        return `${day}/${month}/${year}`;
    };

    const hasMemberDetail = (member: Member): boolean =>
        !!member.serialNo &&
        !member.error &&
        [
            member.relation,
            member.gender,
            member.dob,
            member.salary,
            member.visa,
            member.category,
            member.marital
        ].some(value => !!value);

    const isYesAnswer = (answer: any): boolean =>
        answer === true ||
        answer?.toString().toLowerCase() === "yes";

    console.log("MedicalControlUI - existingData:", existingData);

    const getExistingQuestionAnswer = (question: any): boolean => {

        const existingQuestions =
            existingData?.questions || [];

        const matchedQuestion =
            existingQuestions.find((q: any) =>
                q.questionId === question.id ||
                q.id === question.id ||
                q.question === question.question
            );

        return matchedQuestion
            ? isYesAnswer(matchedQuestion.answer)
            : false;
    };

    const buildExistingMembers = (): Member[] => {

        const existingMembers =
            existingData?.medicalDeclaredMembers || [];

        return existingMembers
            .filter((m: any) => m.serialNo)
            .map((m: any, index: number) => ({

                id: Date.now() + index,
                serialNo: Number(m.serialNo),
                relation: m.relation || "",
                gender: m.gender || "",
                dob: formatDob(m.dateOfBirth || m.dob),
                salary: m.salary || "",
                visa: m.visa || "",
                category: m.category || "",
                marital: m.marital || "",
                comments: m.comments || "",
                files:
                    (m.files || []).map((f: any) => ({
                        id: f.id || f.annotationId || "",
                        annotationId: f.annotationId || f.id || "",
                        name: f.fileName || f.name || "",
                        mimeType: f.mimeType || "",
                        size: f.size || 0
                    })),
                error: "",
                uploadError: ""
            }));
    };

    const [questions, setQuestions] = React.useState<Question[]>([]);

    const [members, setMembers] = React.useState<Member[]>([]);

    const [isLoadingQuestions, setIsLoadingQuestions] = React.useState(true);

    const [uploadingCounts, setUploadingCounts] = React.useState<Record<number, number>>({});

    const fileRefs = React.useRef<
        Record<number, HTMLInputElement | null>
    >({});

    const uploadsInProgressRef = React.useRef<Set<string>>(new Set());

    React.useEffect(() => {
        loadQuestions();
    }, []);

    // =====================================
    // AUTO OUTPUT
    // =====================================

    React.useEffect(() => {

        emitOutput(
            questions,
            members
        );

    }, [questions, members]);

    // =====================================
    // OUTPUT
    // =====================================

    const emitOutput = (
        questionsData: Question[],
        membersData: Member[]
    ) => {

        if (!onChange) return;

        const output = {

            questions: questionsData.map(q => ({

                questionId: q.id,
                question: q.question,
                answer: q.answer ? "Yes" : "No",
                category: q.category || ""

            })),

            medicalDeclaredMembers:
                membersData

                    .filter(m => m.serialNo)

                    .map(m => ({

                        serialNo: m.serialNo,

                        relation:
                            m.relation || "",

                        gender:
                            m.gender || "",

                        dateOfBirth:
                            m.dob || "",

                        salary:
                            m.salary || "",

                        visa:
                            m.visa || "",

                        category:
                            m.category || "",

                        marital:
                            m.marital || "",

                        comments:
                            m.comments || "",

                        files:
                            (m.files || []).map(f => ({

                                id: f.id || f.annotationId || "",
                                annotationId: f.annotationId || f.id || "",
                                fileName: f.name,
                                mimeType: f.mimeType || "",
                                size: f.size || 0

                            }))

                    }))
        };

        onChange(output);
    };

    // =====================================
    // ENVIRONMENT VARIABLES
    // =====================================

    const getEnvironmentVariable = (
        schemaName: string
    ): string => {

        try {

            const formContext =
                (window as any).Xrm?.Page;

            const value =
                formContext
                    ?.getAttribute(schemaName)
                    ?.getValue();

            return value || "";

        } catch {

            return "";
        }
    };

    // =====================================
    // GET PRODUCT CODE
    // =====================================

    const getProductCode = (): string => {

        let productCode = "";

        try {

            const formContext =
                (window as any).Xrm?.Page;

            if (formContext) {

                const val =
                    formContext
                        .getAttribute("adnic_name")
                        ?.getValue();

                if (val) {
                    productCode =
                        val.toString().toUpperCase();
                }
            }

        } catch { }

        return productCode;
    };

    // =====================================
    // LOAD QUESTIONS
    // =====================================

    const loadQuestions = async () => {

        setIsLoadingQuestions(true);

        try {
            const productCode =
                getProductCode();

            // API URL FROM ENV VARIABLE
            const medicalApiUrl =
                getEnvironmentVariable(
                    "adnic_medicalquestionsapi"
                ) || apiUrl;

            const res = await fetch(
                medicalApiUrl + "?product=" + productCode
            );

            if (!res.ok) {
                throw new Error(`Question API returned ${res.status}`);
            }

            const data = await res.json();

            const mapped: Question[] =
                (data.medicalQuestions || [])

                    .filter((q: any) =>
                        q.question?.toString().trim().toLowerCase() !==
                        EXCLUDED_QUESTION
                    )

                    .map((q: any) => ({

                        id: q.id,
                        question: q.question,
                        displayOrder: q.displayOrder,
                        answer: getExistingQuestionAnswer(q),
                        category: q.category || ""
                    }));

            setQuestions(mapped);

            const existingMembers =
                buildExistingMembers();

            const hasExistingYes =
                mapped.some(q => q.answer);

            if (existingMembers.length > 0) {

                setMembers(existingMembers);

            } else if (hasExistingYes) {

                setMembers([
                    createBlankMember()
                ]);
            }
        } catch (error) {
            console.error("Failed to load medical questions", error);
        } finally {
            setIsLoadingQuestions(false);
        }
    };

    // =====================================
    // TOGGLE
    // =====================================

    const handleToggle = (
        id: number,
        checked?: boolean
    ) => {

        if (isDisabled) return;

        const updated =
            questions.map(q =>

                q.id === id
                    ? {
                        ...q,
                        answer: !!checked
                    }
                    : q
            );

        setQuestions(updated);

        const hasYes =
            updated.some(q => q.answer);

        if (!hasYes) {
            setMembers([]);
            return;
        }

        if (checked && members.length === 0) {
            setMembers([
                createBlankMember()
            ]);
        }
    };

    // =====================================
    // ADD ROW
    // =====================================

    const addRow = () => {

        if (isDisabled) return;

        setMembers(prev => [
            ...prev,
            createBlankMember()
        ]);
    };

    // =====================================
    // UPDATE COMMENTS
    // =====================================

    const updateComments = (
        id: number,
        val?: string
    ) => {

        if (isDisabled) return;

        const updatedMembers =
            members.map(m =>

                m.id === id
                    ? {
                        ...m,
                        comments: val
                    }
                    : m
            );

        setMembers(updatedMembers);
    };


        const fileToBase64 = (file: File): Promise<string> => {

        return new Promise((resolve, reject) => {

            const reader = new FileReader();

            reader.onload = () => {

                const result =
                    reader.result?.toString() || "";

                const base64 =
                    result.indexOf(",") >= 0
                        ? result.split(",")[1]
                        : result;

                resolve(base64);
            };

            reader.onerror = reject;

            reader.readAsDataURL(file);
        });
    };

    const getFileDataUrl = async (file: any): Promise<string> => {

        const id =
            file.annotationId || file.id;

        if (!id) {
            return "";
        }

        const result =
            await pcfContext.webAPI.retrieveRecord(
                "annotation",
                id,
                "?$select=documentbody,filename,mimetype"
            );

        return `data:${result.mimetype || "application/pdf"};base64,${result.documentbody}`;
    };

    const normalizeAnnotationId = (value?: any): string => {

        if (value && typeof value === "object") {
            return normalizeAnnotationId(
                value.annotationId ||
                value.id ||
                value.value
            );
        }

        return String(value || "")
            .trim()
            .replace(/[{}]/g, "");
    };

    // =====================================
    // HANDLE UPLOAD
    // =====================================

    const handleUpload = async (
    id: number,
    file: File
        ) => {

            if (isDisabled) return;

            const currentMember =
                members.find(m => m.id === id);

            if (!currentMember || !hasMemberDetail(currentMember)) {

                setMembers(prev =>
                    prev.map(m =>
                        m.id === id
                            ? {
                                ...m,
                                uploadError:
                                    "Enter valid member details before uploading"
                            }
                            : m
                    )
                );

                return;
            }

            const uploadKey =
                `${id}:${normalizeFileName(file.name)}`;

            const isAlreadyUploaded =
                (currentMember.files || []).some(
                    existingFile =>
                        normalizeFileName(existingFile.name) ===
                        normalizeFileName(file.name)
                );

            if (
                isAlreadyUploaded ||
                uploadsInProgressRef.current.has(uploadKey)
            ) {

                setMembers(prev =>
                    prev.map(m =>
                        m.id === id
                            ? {
                                ...m,
                                uploadError:
                                    "This file has already been uploaded for this member."
                            }
                            : m
                    )
                );

                return;
            }

            const currentFileCount = currentMember?.files?.length || 0;

            if (currentFileCount >= MAX_FILES_PER_MEMBER) {

                setMembers(prev =>
                    prev.map(m =>
                        m.id === id
                            ? {
                                ...m,
                                uploadError: `You can upload up to ${MAX_FILES_PER_MEMBER} files per member.`
                            }
                            : m
                    )
                );

                return;
            }

            if (!isAllowedFile(file)) {

                setMembers(prev =>
                    prev.map(m =>
                        m.id === id
                            ? {
                                ...m,
                                uploadError:
                                    "Only PDF, JPG/JPEG, and PNG files are allowed"
                            }
                            : m
                    )
                );

                return;
            }

            if (file.size > MAX_FILE_SIZE_BYTES) {

                setMembers(prev =>
                    prev.map(m =>
                        m.id === id
                            ? {
                                ...m,
                                uploadError: "Maximum file size is 5 MB"
                            }
                            : m
                    )
                );

                return;
            }

            uploadsInProgressRef.current.add(uploadKey);

            setUploadingCounts(prev => ({
                ...prev,
                [id]: (prev[id] || 0) + 1
            }));

            try {

                const base64 =
                    await fileToBase64(file);

                const annotation = {
                    subject:
                        `Temporary Medical Report - Serial ${currentMember.serialNo}`,
                    filename:
                        file.name,
                    mimetype:
                        file.type || "application/pdf",
                    documentbody:
                        base64,
                    notetext:
                        "Temporary medical declaration file uploaded from PCF."
                };

                const created =
                    await pcfContext.webAPI.createRecord(
                        "annotation",
                        annotation
                    );

                const annotationId =
                    created.id.replace(/[{}]/g, "");

                setMembers(prev =>
                    prev.map(m => {

                        if (m.id !== id) {
                            return m;
                        }

                        return {
                            ...m,
                            files: [
                                ...(m.files || []),
                                {
                                    id: annotationId,
                                    annotationId,
                                    name: file.name,
                                    mimeType: file.type || "application/pdf",
                                    size: file.size
                                }
                            ],
                            uploadError: ""
                        };
                    })
                );

            } catch (e) {

                console.error("Upload failed", e);

                setMembers(prev =>
                    prev.map(m =>
                        m.id === id
                            ? {
                                ...m,
                                uploadError: "File upload failed."
                            }
                            : m
                    )
                );
            } finally {
                setUploadingCounts(prev => ({
                    ...prev,
                    [id]: Math.max(0, (prev[id] || 1) - 1)
                }));
                uploadsInProgressRef.current.delete(uploadKey);
            }
        };


    // =====================================
    // REMOVE FILE
    // =====================================
const removeFile = async (
    memberId: number,
    fileIndex: number
) => {

    if (isDisabled) return;

    const member =
        members.find(m => m.id === memberId);

    const file =
        member?.files?.[fileIndex];

    try {

        const annotationId =
            normalizeAnnotationId(
                file?.annotationId || file?.id
            );

        if (annotationId) {

            await pcfContext.webAPI.deleteRecord(
                "annotation",
                annotationId
            );
        }

    } catch (e) {

        console.error("Delete annotation failed", e);
    }

    const updatedMembers =
        members.map(m => {

            if (m.id !== memberId) {
                return m;
            }

            return {
                ...m,
                files:
                    (m.files || []).filter(
                        (_, i) => i !== fileIndex
                    )
            };
        });

    setMembers(updatedMembers);
};


    // =====================================
    // VIEW FILE
    // =====================================

const viewFile = async (file: any) => {

    const url =
        await getFileDataUrl(file);

    if (!url) return;

    const win = window.open();

    if (win) {

        win.document.write(`
            <iframe
                src="${url}"
                frameborder="0"
                style="width:100%;height:100%;">
            </iframe>
        `);
    }
};

const downloadFile = async (file: any) => {

    const url =
        await getFileDataUrl(file);

    if (!url) return;

    const link =
        document.createElement("a");

    link.href = url;
    link.download = file.name || "medical-report.pdf";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
};
    // =====================================
    // SERIAL NUMBER CHANGE
    // =====================================

    const handleSerialChange = (
        id: number,
        value?: string
    ) => {

        if (isDisabled) return;

        const serial = Number(value);

        let membersData: any[] = [];

        try {

            const raw =
                (window as any).Xrm?.Page
                    ?.getAttribute(
                        "adnic_memberlistjson"
                    )
                    ?.getValue();

            membersData =
                raw
                    ? JSON.parse(raw)
                    : [];

        } catch {

            membersData = [];
        }

        const updatedMembers =
            members.map(m => {

                if (m.id !== id) {
                    return m;
                }

                // EMPTY
                if (!value) {

                    return clearMemberValues(m);
                }

                if (
                    !Number.isInteger(serial) ||
                    serial <= 0
                ) {

                    return clearMemberValues(
                        m,
                        undefined,
                        "Invalid serial number"
                    );
                }

                // DUPLICATE
                const duplicate =
                    members.some(x =>

                        x.id !== id &&
                        x.serialNo === serial
                    );

                if (duplicate) {

                    return clearMemberValues(
                        m,
                        serial,
                        "Serial number already used"
                    );
                }

                // INVALID
                if (!membersData[serial - 1]) {

                    return clearMemberValues(
                        m,
                        serial,
                        "Invalid serial number"
                    );
                }

                // MATCHED
                const matched =
                    membersData[serial - 1];

                return {

                    ...m,

                    serialNo: serial,

                    relation:
                        matched.relation || "",

                    gender:
                        matched.gender || "",

                    dob:
                        formatDob(matched.dateOfBirth),

                    salary:
                        matched.salaryType || "",

                    visa:
                        matched.visaLocation || "",

                    category:
                        matched.category || "",

                    marital:
                        matched.maritalStatus || "",

                    error: "",
                    uploadError: ""
                };
            });

        setMembers(updatedMembers);
    };

    // =====================================
    // ANY YES
    // =====================================

    const anyYes =
        questions.some(q => q.answer);

    // =====================================
    // UI
    // =====================================

    return (

        <div  className={
                    isDisabled
                        ? "medical-pcf readonly"
                        : "medical-pcf"
                }>

            <Stack tokens={{ childrenGap: 15 }}>

                {/* QUESTIONS */}

                {isLoadingQuestions && (
                    <div className="questions-loading" role="status">
                        <Spinner
                            size={SpinnerSize.medium}
                            label="Loading medical questions..."
                        />
                    </div>
                )}

                {!isLoadingQuestions && questions
                    .sort((a, b) =>
                        a.displayOrder - b.displayOrder
                    )

                    .map(q => (

                        <div key={q.id}>

                            <div className="question-row">

                                <Text>
                                    {q.question}
                                </Text>

                                <Toggle
                                    checked={q.answer}
                                    disabled={isDisabled}
                                    onChange={(
                                        e,
                                        checked
                                    ) =>
                                        handleToggle(
                                            q.id,
                                            checked
                                        )
                                    }
                                    onText="Yes"
                                    offText="No"
                                />

                            </div>

                            {q.answer && (

                                <div className="medical-alert">
                                    Medical declaration detected.
                                </div>
                            )}

                        </div>
                    ))}

                {/* GRID */}

                {anyYes && (

                    <div className="grid-wrapper">

                        {/* HEADER */}

                        <div className="grid-header">

                            <Text variant="mediumPlus">
                                Medical Declared Members
                            </Text>

                            <div className="header-actions">

                                <DefaultButton
                                     disabled={isDisabled}
                                    text="Download Template"
                                    iconProps={{
                                        iconName: "Download"
                                    }}
                                    onClick={() => {

                                        window.open(
                                            getEnvironmentVariable(
                                                "adnic_medicaltemplateurl"
                                            ) ||
                                            "https://nexusdev.adnic.ae/dev/sales/MedicalApplicationForm.pdf",
                                            "_blank",
                                            "noopener,noreferrer"
                                        );
                                    }}
                                />

                                <PrimaryButton
                                    text="Add Row"
                                    disabled={isDisabled}
                                    iconProps={{
                                        iconName: "Add"
                                    }}
                                    onClick={addRow}
                                />

                            </div>

                        </div>

                        {/* GRID HEADER */}

                        <div className="row header grid">

                            <div>Serial No</div>
                            <div>Relation</div>
                            <div>Gender</div>
                            <div>DOB</div>
                            <div>Salary</div>
                            <div>Visa</div>
                            <div>Category</div>
                            <div>Marital</div>

                        </div>

                        {/* ROWS */}

                        {members.map(m => (

                            <div
                                key={m.id}
                                className={`member-block ${m.error ? "error" : ""}`}
                            >

                                {/* GRID ROW */}

                                <div className="row grid">

                                    <TextField
                                        value={
                                            m.serialNo
                                                ? m.serialNo.toString()
                                                : ""
                                        }
                                        disabled={isDisabled}
                                        errorMessage={m.error}
                                        onChange={(
                                            e,
                                            val
                                        ) =>
                                            handleSerialChange(
                                                m.id,
                                                val
                                            )
                                        }
                                        styles={{
                                            errorMessage: {
                                                whiteSpace:
                                                    "pre-line"
                                            }
                                        }}
                                    />

                                    <div>{m.relation}</div>
                                    <div>{m.gender}</div>
                                    <div>{m.dob}</div>
                                    <div>{m.salary}</div>
                                    <div>{m.visa}</div>
                                    <div>{m.category}</div>
                                    <div>{m.marital}</div>

                                </div>

                                {/* DETAILS */}

                                <div className="row-details">

                                    <TextField
                                        disabled={isDisabled}
                                        placeholder="Enter comments..."
                                        multiline
                                        rows={2}
                                        value={m.comments}
                                        onChange={(
                                            e,
                                            val
                                        ) =>
                                            updateComments(
                                                m.id,
                                                val
                                            )
                                        }
                                    />

                                    {/* FILES */}

                                    <div className="file-upload-section">

                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                            disabled={
                                                isDisabled ||
                                                !hasMemberDetail(m) ||
                                                (uploadingCounts[m.id] || 0) > 0
                                            }
                                            multiple
                                            style={{
                                                display: "none"
                                            }}
                                            ref={(el) => {
                                                fileRefs.current[m.id] = el;
                                            }}
                                            onChange={(e) => {

                                                const files =
                                                    Array.from(
                                                        e.target.files || []
                                                    );
                                                const currentFiles =
                                                    m.files || [];
                                                const remainingSlots =
                                                    MAX_FILES_PER_MEMBER - currentFiles.length;

                                                if (files.length > remainingSlots) {
                                                    setMembers(prev =>
                                                        prev.map(member =>
                                                            member.id === m.id
                                                                ? {
                                                                    ...member,
                                                                    uploadError: `You can upload up to ${MAX_FILES_PER_MEMBER} files per member.`
                                                                }
                                                                : member
                                                        )
                                                    );
                                                }

                                                files
                                                    .slice(0, remainingSlots)
                                                    .forEach(file => {
                                                        handleUpload(m.id, file);
                                                    });

                                                e.target.value = "";
                                            }}
                                        />

                                        {(uploadingCounts[m.id] || 0) > 0 && (
                                            <span className="upload-processing-indicator">
                                                Processing...
                                            </span>
                                        )}

                                        {(m.files || []).length === 0 && (

                                            <DefaultButton
                                                iconProps={{
                                                    iconName: "Upload"
                                                }}
                                                text="Upload File"
                                                disabled={
                                                    isDisabled ||
                                                    !hasMemberDetail(m) ||
                                                    (uploadingCounts[m.id] || 0) > 0
                                                }
                                                className="upload-btn"
                                                onClick={() =>
                                                    fileRefs.current[m.id]?.click()
                                                }
                                            />
                                        )}

                                        {(m.files || []).length > 0 && (

                                            <div className="uploaded-files">

                                                {(m.files || []).map((f, index) => (

                                                    <div
                                                        key={index}
                                                        className="uploaded-file-card"
                                                    >

                                                        <div className="uploaded-file-left">

                                                            <span className="file-check">
                                                                ✓
                                                            </span>

                                                            <span className="uploaded-file-name">
                                                                {f.name}
                                                            </span>

                                                        </div>

                                                        <div className="uploaded-file-actions">

                                                            <button
                                                                type="button"
                                                                className="file-view-btn"
                                                                onClick={() => viewFile(f)}
                                                            >
                                                                <span className="file-action-icon" aria-hidden="true">
                                                                    <svg viewBox="0 0 16 16" focusable="false">
                                                                        <path d="M8 3c3.3 0 5.8 2.8 6.7 4.1a1.5 1.5 0 0 1 0 1.8C13.8 10.2 11.3 13 8 13s-5.8-2.8-6.7-4.1a1.5 1.5 0 0 1 0-1.8C2.2 5.8 4.7 3 8 3Zm0 1C5.2 4 3 6.5 2.1 7.7a.5.5 0 0 0 0 .6C3 9.5 5.2 12 8 12s5-2.5 5.9-3.7a.5.5 0 0 0 0-.6C13 6.5 10.8 4 8 4Zm0 1.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
                                                                    </svg>
                                                                </span>
                                                                <span>View</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="file-view-btn file-download-btn"
                                                                onClick={() => downloadFile(f)}
                                                            >
                                                                <span className="file-action-icon" aria-hidden="true">
                                                                    <svg viewBox="0 0 16 16" focusable="false">
                                                                        <path d="M7.5 1a.5.5 0 0 1 1 0v8.3l2.15-2.15a.5.5 0 0 1 .7.7l-3 3a.5.5 0 0 1-.7 0l-3-3a.5.5 0 1 1 .7-.7L7.5 9.3V1ZM2 12.5a.5.5 0 0 1 .5.5v1h11v-1a.5.5 0 0 1 1 0v1.5a.5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5V13a.5.5 0 0 1 .5-.5Z" />
                                                                    </svg>
                                                                </span>
                                                                <span>Download</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                disabled={isDisabled}
                                                                className="file-delete-btn"
                                                                onClick={() =>
                                                                    removeFile(
                                                                        m.id,
                                                                        index
                                                                    )
                                                                }
                                                            >
                                                                <span className="file-action-icon" aria-hidden="true">
                                                                    <svg viewBox="0 0 16 16" focusable="false">
                                                                        <path d="M6 2h4l.5 1H14a.5.5 0 0 1 0 1h-.54l-.75 10.08A1 1 0 0 1 11.71 15H4.29a1 1 0 0 1-1-.92L2.54 4H2a.5.5 0 0 1 0-1h3.5L6 2Zm-2.46 2 .75 10h7.42l.75-10H3.54ZM6 6a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5A.5.5 0 0 1 6 6Zm4 0a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5A.5.5 0 0 1 10 6Z" />
                                                                    </svg>
                                                                </span>
                                                                <span>Delete</span>
                                                            </button>

                                                        </div>

                                                    </div>
                                                ))}

                                                <div className="add-more-container">

                                                    <DefaultButton
                                                        text="Add More Files"
                                                        disabled={
                                                            isDisabled ||
                                                            !hasMemberDetail(m) ||
                                                            (uploadingCounts[m.id] || 0) > 0
                                                        }
                                                        iconProps={{
                                                            iconName: "Upload"
                                                        }}
                                                        className="add-more-btn"
                                                        onClick={() =>
                                                            fileRefs.current[m.id]?.click()
                                                        }
                                                    />

                                                </div>

                                            </div>
                                        )}

                                        {m.uploadError && (

                                            <Text className="upload-error">
                                                {m.uploadError}
                                            </Text>
                                        )}

                                    </div>

                                </div>

                            </div>
                        ))}

                    </div>
                )}

            </Stack>

        </div>
    );
};

export default MedicalControlUI;
