import { Button, LoadingOverlay, NativeSelect, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useCallback, useState } from "react";
import { CommandHelper } from "../../utils/CommandHelper";
import ConsoleWrapper from "../ConsoleWrapper/ConsoleWrapper";
import { UserGuide } from "../UserGuide/UserGuide";
import { SaveOutputToTextFile_v2 } from "../SaveOutputToFile/SaveOutputToTextFile";

const title = "SlowHTTPTest Generator";
const description_userguide =
    "SlowHTTPTest is a tool used to simulate slow HTTP DoS attacks by sending partial HTTP requests, " +
    "which can consume server resources and exhaust the maximum concurrent connection pool. " +
    "Select the attack type, set the relevant parameters, and click Generate to run the test.";

interface FormValuesType {
    url: string;
    rate: string;
    connections: string;
    duration: string;
    method: string;
    length: string;
    contentLength: string;
    timeout: string;
    readTimeout: string;
    custom: string;
}

const attackTypes = [
    "slowloris",
    "slowbody",
    "slowread",
    "range",
];

const methods = [
    "GET",
    "POST",
    "HEAD",
];

const SlowHTTPTestGenerator = () => {
    const [loading, setLoading] = useState(false);
    const [output, setOutput] = useState("");
    const [allowSave, setAllowSave] = useState(false);
    const [hasSaved, setHasSaved] = useState(false);
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [selectedAttackType, setSelectedAttackType] = useState("");
    const [pid, setPid] = useState("");

    const form = useForm<FormValuesType>({
        initialValues: {
            url: "",
            rate: "",
            connections: "",
            duration: "",
            method: "",
            length: "",
            contentLength: "",
            timeout: "",
            readTimeout: "",
            custom: "",
        },
    });

    const handleProcessData = useCallback((data: string) => {
        setOutput((prevOutput) => prevOutput + "\n" + data);
    }, []);

    const handleProcessTermination = useCallback(
        ({ code, signal }: { code: number; signal: number }) => {
            if (code === 0) {
                handleProcessData("\nProcess completed successfully.");
            } else if (signal === 15) {
                handleProcessData("\nProcess was manually terminated.");
            } else {
                handleProcessData(`\nProcess terminated with exit code: ${code} and signal code: ${signal}`);
            }
            setPid("");
            setLoading(false);
        },
        [handleProcessData]
    );

    const handleCancel = () => {
        if (pid) {
            const args = [`-15`, pid];
            CommandHelper.runCommand("kill", args);
        }
    };

    const handleSaveComplete = useCallback(() => {
        setHasSaved(true);
        setAllowSave(false);
    }, []);

    const onSubmit = async () => {
        setLoading(true);
        setAllowSave(true);
        const args = [];

        if (isCustomMode) {
            args.push(...form.values.custom.split(" "));
        } else {
            if (selectedAttackType) {
                args.push(`-c ${selectedAttackType}`);
            }

            if (form.values.url) {
                args.push(`-u ${form.values.url}`);
            }

            if (form.values.rate) {
                args.push(`-r ${form.values.rate}`);
            }

            if (form.values.connections) {
                args.push(`-t ${form.values.connections}`);
            }

            if (form.values.duration) {
                args.push(`-l ${form.values.duration}`);
            }

            if (form.values.method) {
                args.push(`-m ${form.values.method}`);
            }

            if (form.values.length) {
                args.push(`-l ${form.values.length}`);
            }

            if (form.values.contentLength) {
                args.push(`-H "Content-Length: ${form.values.contentLength}"`);
            }

            if (form.values.timeout) {
                args.push(`-T ${form.values.timeout}`);
            }

            if (form.values.readTimeout) {
                args.push(`-X ${form.values.readTimeout}`);
            }
        }

        try {
            const result = await CommandHelper.runCommandGetPidAndOutput(
                "slowhttptest",
                args,
                handleProcessData,
                handleProcessTermination
            );
            setPid(result.pid);
            setOutput(result.output);
        } catch (e: any) {
            setOutput(e.message);
        }
    };

    const clearOutput = useCallback(() => {
        setOutput("");
        setAllowSave(false);
        setHasSaved(false);
    }, []);

    return (
        <form onSubmit={form.onSubmit(onSubmit)}>
            <LoadingOverlay visible={loading} />
            {loading && (
                <div>
                    <Button variant="outline" color="red" style={{ zIndex: 1001 }} onClick={handleCancel}>
                        Cancel
                    </Button>
                </div>
            )}

            <Stack>
                {UserGuide(title, description_userguide)}

                {/* Add the "Custom" switch */}
                <Switch
                    label="Custom"
                    checked={isCustomMode}
                    onChange={() => {
                        setIsCustomMode(!isCustomMode);
                        setSelectedAttackType(""); // Clear selected attack type when switching modes
                    }}
                />

                {isCustomMode ? (
                    <TextInput
                        label="Custom Input"
                        placeholder="Enter your custom input, e.g., -c slowloris -u http://target.com -r 200"
                        {...form.getInputProps("custom")}
                        required
                    />
                ) : (
                    <>
                        <NativeSelect
                            value={selectedAttackType}
                            onChange={(e) => setSelectedAttackType(e.target.value)}
                            title="Select Attack Type"
                            data={attackTypes}
                            required
                            placeholder="Select Attack Type"
                        />

                        <TextInput
                            label="Target URL"
                            placeholder="Enter target URL, e.g., http://target.com"
                            {...form.getInputProps("url")}
                            required
                        />

                        <TextInput
                            label="Request Rate (rps)"
                            placeholder="Enter request rate per second, e.g., 200"
                            {...form.getInputProps("rate")}
                        />

                        <TextInput
                            label="Connections"
                            placeholder="Enter number of connections, e.g., 1000"
                            {...form.getInputProps("connections")}
                        />

                        <TextInput
                            label="Test Duration (sec)"
                            placeholder="Enter test duration in seconds, e.g., 60"
                            {...form.getInputProps("duration")}
                        />

                        <NativeSelect
                            value={form.values.method}
                            onChange={(e) => form.setFieldValue("method", e.target.value)}
                            title="HTTP Method"
                            data={methods}
                            placeholder="Select HTTP Method"
                        />

                        <TextInput
                            label="Content Length"
                            placeholder="Enter content length for POST, e.g., 4096"
                            {...form.getInputProps("contentLength")}
                        />

                        <TextInput
                            label="Timeout (sec)"
                            placeholder="Enter connection timeout in seconds, e.g., 30"
                            {...form.getInputProps("timeout")}
                        />

                        <TextInput
                            label="Read Timeout (sec)"
                            placeholder="Enter read timeout in seconds, e.g., 15"
                            {...form.getInputProps("readTimeout")}
                        />
                    </>
                )}
            </Stack>

            <Button type="submit" mt="md" fullWidth disabled={loading}>
                Generate
            </Button>

            {allowSave && (
                <SaveOutputToTextFile_v2
                    output={output}
                    onSaveComplete={handleSaveComplete}
                    hasSaved={hasSaved}
                    clearOutput={clearOutput}
                />
            )}

            <ConsoleWrapper output={output} />
        </form>
    );
};

export default SlowHTTPTestGenerator;
