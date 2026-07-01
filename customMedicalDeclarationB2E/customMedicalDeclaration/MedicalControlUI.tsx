import * as React from "react";
import {
    Stack,
    Text,
    Toggle,
    PrimaryButton,
    DefaultButton,
    TextField
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

const MedicalControlUI = ({
    apiUrl,
    onChange,
    isDisabled,
    existingData
    pcfContext
}: any) => {

    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

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

    const fileRefs = React.useRef<
        Record<number, HTMLInputElement | null>
    >({});

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

        const data = await res.json();

        const mapped: Question[] =
            (data.medicalQuestions || [])

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

            if (
                file.type !== "application/pdf" &&
                !file.name.toLowerCase().endsWith(".pdf")
            ) {

                setMembers(prev =>
                    prev.map(m =>
                        m.id === id
                            ? {
                                ...m,
                                uploadError: "Only PDF files are allowed"
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

                const updatedMembers =
                    members.map(m => {

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
                    });

                setMembers(updatedMembers);

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
            }
        };


    // =====================================
    // REMOVE FILE
    // =====================================

    const removeFile = (
        memberId: number,
        fileIndex: number
    ) => {

        if (isDisabled) return;

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
        emitOutput(
            questions,
            updatedMembers
        );
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

                {questions
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
                                            accept=".pdf,application/pdf"
                                            disabled={
                                                isDisabled ||
                                                !hasMemberDetail(m)
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

                                                files.forEach(file => {
                                                    handleUpload(m.id, file);
                                                });

                                                e.target.value = "";
                                            }}
                                        />

                                        {(m.files || []).length === 0 && (

                                            <DefaultButton
                                                iconProps={{
                                                    iconName: "Upload"
                                                }}
                                                text="Upload File"
                                                disabled={
                                                    isDisabled ||
                                                    !hasMemberDetail(m)
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

                                                            <DefaultButton
                                                                text="View"
                                                                iconProps={{
                                                                    iconName: "View"
                                                                }}
                                                                className="file-view-btn"
                                                                onClick={() => viewFile(f)}
                                                            />

                                                            <DefaultButton
                                                                text="Delete"
                                                                disabled={isDisabled}
                                                                iconProps={{
                                                                    iconName: "Delete"
                                                                }}
                                                                className="file-delete-btn"
                                                                onClick={() =>
                                                                    removeFile(
                                                                        m.id,
                                                                        index
                                                                    )
                                                                }
                                                            />

                                                        </div>

                                                    </div>
                                                ))}

                                                <div className="add-more-container">

                                                    <DefaultButton
                                                        text="Add More Files"
                                                        disabled={
                                                            isDisabled ||
                                                            !hasMemberDetail(m)
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
