import { makeStyles } from "@mui/styles";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import AddLinkIcon from "@mui/icons-material/AddLink";
import BuildIcon from "@mui/icons-material/Build";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";

import { useState, memo, useEffect } from "react";
import { Preset } from "./utils/types";
import OneShotButton from "./OneShotButton";
import LoopButton from "./LoopButton";
import EmptyButton from "./EmptyButton";
import Metronome from "./Metronome";
import { useAppSelector } from "../../modules/hooks";
import { getAudioArrayBuffer } from "../../api/getAudioArrayBuffer";
import { ButtonColors } from "../../utils/CommonStyle";
import { useDispatch } from "react-redux";
import { actions as soundButtonsActions } from "../../modules/actions/soundButtonsSlice";
import { actions as loopSoundGroupActions } from "../../modules/actions/loopSoundGroupSlice";

const LaunchPadStyles = makeStyles({
  //색깔, 폰트크기들 프로젝트 컬러로 변경해야함
  root: {
    margin: "10px",
    display: "flex",
    flexDirection: "column",
  },
  btnContainer: {
    display: "grid",
    justifyContent: "space-evenly",

    gridTemplateRows: "repeat(8, 52px)",
    gridTemplateColumns: "repeat(8, 52px)",
    gridGap: "7px",

    margin: "0px 15px",
  },
});

interface LaunchPadProps {
  presetData: Preset;
  sampleSoundMap: Map<string, string>; //<K=location, V=sampleSoundURL>
}

function RenderButtons({ presetData }: Pick<LaunchPadProps, "presetData">) {
  const classes = LaunchPadStyles();

  return (
    <div className={classes.btnContainer}>
      {presetData.soundSamples.map(
        (
          { soundSampleId, soundSampleURL, buttonType, soundType, location },
          idx
        ) => {
          switch (buttonType) {
            case "ONESHOT":
              return (
                <div key={soundSampleId + location}>
                  <OneShotButton
                    soundSampleURL={soundSampleURL}
                    buttonType={buttonType}
                    soundType={soundType}
                    location={location}
                  />
                </div>
              );

            case "LOOP":
              return (
                <div key={soundSampleId + location}>
                  <LoopButton
                    soundSampleURL={soundSampleURL}
                    buttonType={buttonType}
                    soundType={soundType}
                    location={location}
                  />
                </div>
              );

            default:
              return (
                <div key={soundSampleId + location}>
                  <EmptyButton />
                </div>
              );
          }
        }
      )}
    </div>
  );
}

//8x8 scale
export function LaunchPad({ presetData, sampleSoundMap }: LaunchPadProps) {
  const classes = LaunchPadStyles();
  const dispatch = useDispatch();
  const { nowBar, soundGroup, nowPlayingSampleSounds, nowWaitStopSampleSound } =
    useAppSelector((state) => state.loopSoundGroupSlice);
  const [alreadyPlayedSoundSamples, setAlreadyPlayedSoundSamples] = useState(
    new Map()
  );

  const getBufferSource = async (url: string | undefined, location: string) => {
    if (url === undefined) return;
    const data: ArrayBuffer = await getAudioArrayBuffer(url);

    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(data);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    source.connect(audioContext.destination);
    source.start();
    dispatch(
      soundButtonsActions.changeButtonState({
        location,
        state: "PLAY",
      })
    );

    return source;
  };

  const stopBufferSource = async (
    btnLocation: string,
    sourcePromise: Promise<AudioBufferSourceNode | undefined>
  ) => {
    if (sourcePromise === undefined) return;
    await sourcePromise.then((res) => {
      if (res === undefined) return;
      const context = new AudioContext();

      setTimeout(() => {
        dispatch(
          soundButtonsActions.changeButtonState({
            location: btnLocation,
            state: "STOP",
          })
        );
      }, res.buffer!.duration * 1000);

      res.stop(context.currentTime + res.buffer!.duration); //남은 한 사이클 재생후 정지
      // res.stop(); //일단 바로정지하는 기능만 올려두고 나중에 바꾸기
      const newPlayedSoundSamples = alreadyPlayedSoundSamples;
      newPlayedSoundSamples.delete(btnLocation);
      setAlreadyPlayedSoundSamples(newPlayedSoundSamples);
    });
  };

  useEffect(() => {
    const newPlayedSoundSamples = alreadyPlayedSoundSamples;

    console.log(
      "삭제대상",
      nowWaitStopSampleSound,
      alreadyPlayedSoundSamples.get(nowWaitStopSampleSound)
    );
    stopBufferSource(
      nowWaitStopSampleSound,
      alreadyPlayedSoundSamples.get(nowWaitStopSampleSound)
    );
    newPlayedSoundSamples.delete(nowWaitStopSampleSound);

    dispatch(loopSoundGroupActions.clearWaitStopQueue());
    dispatch(
      soundButtonsActions.changeButtonState({
        location: nowWaitStopSampleSound,
        state: "WAIT_STOP",
      })
    );
    setAlreadyPlayedSoundSamples(newPlayedSoundSamples);
  }, [nowWaitStopSampleSound]);

  useEffect(() => {
    console.log(alreadyPlayedSoundSamples);
    soundGroup[nowBar].map((btnLocation) => {
      if (alreadyPlayedSoundSamples.get(btnLocation)) {
        console.log("이미 재생했어!");
      } else {
        const sourcePromise = getBufferSource(
          sampleSoundMap.get(btnLocation),
          btnLocation
        );
        const newPlayedSet = alreadyPlayedSoundSamples;
        newPlayedSet.set(btnLocation, sourcePromise);
        setAlreadyPlayedSoundSamples(newPlayedSet);

        // stopBufferSource(btnLocation, sourcePromise);
      }
    });
  }, [nowBar]);

  return (
    <>
      <div className={classes.root}>
        <Metronome />

        <RenderButtons presetData={presetData} />
      </div>
    </>
  );
}

export default LaunchPad;
