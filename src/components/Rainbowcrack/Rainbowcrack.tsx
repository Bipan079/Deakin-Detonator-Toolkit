import { Button, Stack, TextInput, Select } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useCallback, useState, useEffect } from "react";
import { CommandHelper } from "../../utils/CommandHelper";
import ConsoleWrapper from "../ConsoleWrapper/ConsoleWrapper";
import { RenderComponent } from "../UserGuide/UserGuide";
import { SaveOutputToTextFile_v2 } from "../SaveOutputToFile/SaveOutputToTextFile";
import { LoadingOverlayAndCancelButton } from "../OverlayAndCancelButton/OverlayAndCancelButton";
import { checkAllCommandsAvailability } from "../../utils/CommandAvailability";
import InstallationModal from "../InstallationModal/InstallationModal";

interface FormValuesType {
  hashValue: string;
  operation: "crack" | "generate";
  hashAlgorithm: string;
  charset: string;
  plaintextLength: string;
  tableFile: string;
}

const RainbowCrack = () => {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [pid, setPid] = useState("");
  const [isCommandAvailable, setIsCommandAvailable] = useState(false);
  const [opened, setOpened] = useState(!isCommandAvailable);
  const [loadingModal, setLoadingModal] = useState(true);
  const [allowSave, setAllowSave] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const title = "RainbowCrack";
  const description =
    "RainbowCrack is a computer program which utilises rainbow tables to be used in password cracking.";
  const steps =
    "How to use RainbowCrack \n" +
    "Step 1: Enter a hash value. (E.g. 5d41402abc4b2a76b9719d911017c592) \n" +
    "Step 2: Simply tap on the crack button to crack the hash key. \n" +
    "Step 3: To generate tables, select 'Generate Table' and provide the necessary parameters.";
  const dependencies = ["rcrack", "rtgen"];

  const form = useForm({
    initialValues: {
      hashValue: "",
      operation: "crack",
      hashAlgorithm: "md5",
      charset: "numeric",
      plaintextLength: "1-7",
      tableFile: "table.rt",
    },
  });

  useEffect(() => {
    checkAllCommandsAvailability(dependencies)
      .then((isAvailable) => {
        setIsCommandAvailable(isAvailable);
        setOpened(!isAvailable);
        setLoadingModal(false);
      })
      .catch((error) => {
        console.error("An error occurred:", error);
        setLoadingModal(false);
      });
  }, []);

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

  const onSubmit = async (values: FormValuesType) => {
    setLoading(true);

    let command = "rcrack";
    let args = [values.hashValue];

    if (values.operation === "generate") {
      command = "rtgen";
      args = [values.hashAlgorithm, values.charset, values.plaintextLength, values.tableFile];
    }

    CommandHelper.runCommandGetPidAndOutput(command, args, handleProcessData, handleProcessTermination)
      .then(({ output, pid }) => {
        setOutput(output);
        setPid(pid);
      })
      .catch((error) => {
        setOutput(error.message);
        setLoading(false);
      });
  };

  const clearOutput = useCallback(() => {
    setOutput("");
  }, [setOutput]);

  const handleSaveComplete = () => {
    setHasSaved(true);
  };

  return (
    <RenderComponent title={title} description={description} steps={steps}>
      {!loadingModal && (
        <InstallationModal
          isOpen={opened}
          setOpened={setOpened}
          feature_description={description}
          dependencies={dependencies}
        />
      )}
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack>
          {LoadingOverlayAndCancelButton(loading, pid)}
          <Select
            label="Operation"
            required
            data={[
              { value: "crack", label: "Crack Hash" },
              { value: "generate", label: "Generate Table" },
            ]}
            {...form.getInputProps("operation")}
          />
          {form.values.operation === "crack" ? (
            <TextInput label="Hash Value" required {...form.getInputProps("hashValue")} />
          ) : (
            <>
              <TextInput label="Hash Algorithm" required {...form.getInputProps("hashAlgorithm")} />
              <TextInput label="Charset" required {...form.getInputProps("charset")} />
              <TextInput label="Plaintext Length (e.g. 1-7)" required {...form.getInputProps("plaintextLength")} />
              <TextInput label="Table File" required {...form.getInputProps("tableFile")} />
            </>
          )}
          {SaveOutputToTextFile_v2(output, allowSave, hasSaved, handleSaveComplete)}
          <Button type="submit">Execute</Button>
          <ConsoleWrapper output={output} clearOutputCallback={clearOutput} />
        </Stack>
      </form>
    </RenderComponent>
  );
};

export default RainbowCrack;
