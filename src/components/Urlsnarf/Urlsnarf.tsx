import { Button, LoadingOverlay, NativeSelect, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useCallback, useState } from "react";
import { CommandHelper } from "../../utils/CommandHelper";
import ConsoleWrapper from "../ConsoleWrapper/ConsoleWrapper";
import { UserGuide } from "../UserGuide/UserGuide";
import { SaveOutputToTextFile_v2 } from "../SaveOutputToFile/SaveOutputToTextFile";
import { LoadingOverlayAndCancelButton } from "../OverlayAndCancelButton/OverlayAndCancelButton";

const title = "Urlsnarf";
const description_userguide =
    "Urlsnarf is a network traffic sniffing tool that works to output all URL's that are requested from HTTP " +
    "traffic in the from of CLF (Common Log Format) that is very commonly used within web servers. The tool " +
    "in the DDT provides two listener settings being through an interface or packet capture file.\n\nInformation " +
    "on the tool can be found at: https://linux.die.net/man/8/urlsnarf\n\n" +
    "Using the tool:\n" +
    "Step 1: Select the Listener settings.\n" +
    "       Eg: Interface\n\n" +
    "Step 2: Input the Interface.\n" +
    "       Eg: eth0\n\n" +
    "Step 3: Enter any Exclusion details within the sniff.\n" +
    "       Eg: POST (every packet besides POST will be shown)\n\n" +
    "Step 4: Click Sniff to commence Urlsnarf's operation.\n\n" +
    "Step 5: View the Output block below to view the results of the tools execution.";

interface FormValuesType {
    listenerInputType: string;
    listenerArgs: string;
    versusMode: string;
}

const listeners = ["Interface", "Packet capture file"];

const Urlsnarf = () => {
    const [loading, setLoading] = useState(false);
    const [output, setOutput] = useState("");
    const [selectedListenerInput, setSelectedListenerInput] = useState("");
    const [pid, setPid] = useState("");
    const [allowSave, setAllowSave] = useState(false);
    const [hasSaved, setHasSaved] = useState(false);

    let form = useForm({
        initialValues: {
            listenerInputType: "",
            listenerArgs: "",
            versusMode: "",
        },
    });

    // Uses the callback function of runCommandGetPidAndOutput to handle and save data
    // generated by the executing process into the output state variable.
    const handleProcessData = useCallback((data: string) => {
        setOutput((prevOutput) => prevOutput + "\n" + data); // Update output
    }, []);

    // Uses the onTermination callback function of runCommandGetPidAndOutput to handle
    // the termination of that process, resetting state variables, handling the output data,
    // and informing the user.
    const handleProcessTermination = useCallback(
        ({ code, signal }: { code: number; signal: number }) => {
            if (code === 0) {
                handleProcessData("\nProcess completed successfully.");
            } else if (signal === 15) {
                handleProcessData("\nProcess was manually terminated.");
            } else {
                handleProcessData(`\nProcess terminated with exit code: ${code} and signal code: ${signal}`);
            }
            // Clear the child process pid reference
            setPid("");
            // Cancel the Loading Overlay
            setLoading(false);
            // Allow Saving as the output is finalised
            setAllowSave(true);
            setHasSaved(false);
        },
        [handleProcessData]
    );

    // Actions taken after saving the output
    const handleSaveComplete = () => {
        // Indicating that the file has saved which is passed
        // back into SaveOutputToTextFile to inform the user
        setHasSaved(true);
        setAllowSave(false);
    };

    const onSubmit = async (values: FormValuesType) => {
        // Disallow saving until the tool's execution is complete
        setAllowSave(false);

        // Start the Loading Overlay
        setLoading(true);

        const args = [];
        if (selectedListenerInput === "Interface") {
            args.push(`-i`, `${values.listenerArgs}`);
        } else if (selectedListenerInput === "Packet capture file") {
            args.push(`-p`, `${values.listenerArgs}`);
        }
        args.push(`-v`, `${values.versusMode}`);

        try {
            const result = await CommandHelper.runCommandGetPidAndOutput(
                "python3",
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
        setHasSaved(false);
        setAllowSave(false);
    }, [setOutput]);

    const isListenerInterface = selectedListenerInput === "Interface";
    const isListenerFile = selectedListenerInput === "Packet capture file";

    return (
        <form
            onSubmit={form.onSubmit((values) =>
                onSubmit({
                    ...values,
                    listenerInputType: selectedListenerInput,
                })
            )}
        >
            {LoadingOverlayAndCancelButton(loading, pid)}
            <Stack>
                {UserGuide(title, description_userguide)}
                <NativeSelect
                    value={selectedListenerInput}
                    onChange={(e) => setSelectedListenerInput(e.target.value)}
                    label={"listener settings"}
                    data={listeners}
                    required
                    placeholder={"Interface or PCAP file"}
                />
                {isListenerInterface && (
                    <TextInput
                        {...form.getInputProps("listenerArgs")}
                        label={"Interface"}
                        placeholder={"eg: eth0"}
                        required
                    />
                )}
                {isListenerFile && (
                    <TextInput
                        {...form.getInputProps("listenerArgs")}
                        label={"File path"}
                        placeholder={"eg: /home/kali/Desktop/pcap.pcapng"}
                        required
                    />
                )}
                <TextInput
                    {...form.getInputProps("versusMode")}
                    label={"Exclusion details"}
                    placeholder={"eg: POST ; show every packet that excludes POST"}
                />
                <Button type={"submit"} color="cyan">
                    Sniff
                </Button>
                {SaveOutputToTextFile_v2(output, allowSave, hasSaved, handleSaveComplete)}
                <ConsoleWrapper output={output} clearOutputCallback={clearOutput} />
            </Stack>
        </form>
    );
};

export default Urlsnarf;
