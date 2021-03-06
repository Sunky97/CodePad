import { makeStyles } from "@mui/styles";

import { PageColors } from "../../utils/CommonStyle";
import { ToggleType } from "../../utils/CommonValue";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { getPreset, PresetParams } from "../../api/getPreset";
import LaunchPad from "../../components/LaunchPad";
import { initialPresetGenerator } from "../../components/LaunchPad/utils/initialPresetFormGenerator";
import { Preset, LaunchPadScale } from "../../components/LaunchPad/utils/types";
import { actions as getPresetActions } from "../../modules/actions/LaunchPad/getPresetSlice";
import { useAppSelector } from "../../modules/hooks";

import LaunchpadHeaderContainer from "../../components/LaunchPad/LaunchPadHeaderContainer";
import PresetToggleButton from "../../components/Preset/PresetToggleButton";
import PresetList from "../../components/Preset/PresetList";
import setPresetData from "../../utils/setPresetData";
import setPresetId from "../../utils/setPresetId";
import PresetImage from "../../components/Preset/PresetImage";
import { actions as soundButtonsActions } from "../../modules/actions/LaunchPad/soundButtonsSlice";
import { GetMyPresetParams, getMyPresetList } from "../../api/getMyPresetList";
import { actions as getMyPresetListActions } from "../../modules/actions/getMyPresetListSlice";
import { PresetListElement } from "../MyPresetsPage/utils/types";
import {
  getDefaultPresetList,
  GetDefaultPresetParams,
} from "../../api/PresetList/getDefaultPresetList";
import { getDefaultPreset } from "../../api/LaunchPadPreset/getDefaultPreset";
import alertSnackBarMessage, {
  SnackBarMessageType,
} from "../../utils/snackBarMessage";

//스타일은 defaultPresetsPage, MyPresetsPage, UserPresetsPage모두 동일하게 사용하는것이 좋을듯
const DefaultPresetsPageStyles = makeStyles({
  root: {
    height: `calc(100% - 64px)`,
    minWidth: "1041px",
  },
  container: {
    margin: "0 auto",
    padding: "50px 0px",
    width: "60%",
    height: "90%",
    minWidth: "1041px",
    minHeight: "814.5px",

    display: "grid",
    gridTemplateRows: "1fr 4fr 3fr",
    gridTemplateColumns: "1fr 1fr",
    gridColumnGap: "20px",
    gridRowGap: "20px",
    gridTemplateAreas: `
    "launchPad togglePresetBtn"
    "launchPad presetList"
    "none presetList"`,

    ["@media (max-width: 800px)"]: {
      display: "grid",
      gridTemplateRows: "1fr 5fr 2fr 6fr",
      gridColumnGap: "20px",
      gridRowGap: "20px",
      gridTemplateAreas: `
    "togglePresetBtn"
    "launchPad"
    "community"
    "presetList"`,
    },

    "& > *": {
      backgroundColor: PageColors.BACKGROUND,
      boxShadow: PageColors.SHADOW,
    },
  },
  launchPad: {
    gridArea: "launchPad",
    minHeight: "570px",
    display: "grid",
    alignItems: "center",
    padding: "10px",

    "& > .launchPadContainer": {
      margin: "10px",
      display: "grid",
    },
  },

  togglePresetBtn: {
    gridArea: "togglePresetBtn",

    display: "flex",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  presetList: {
    gridArea: "presetList",
    minWidth: "460px",
    display: "grid",
    alignItems: "center",
    justifyItems: "center",

    "& > .presetListContainer": {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      width: "93%",
    },
  },
  community: {
    gridArea: "community",
    display: "none",
  },
});

interface NowSelectedDefaultPreset {
  presetId: string;
  title: string;
  thumbnailURL: string;
}

export function DefaultPresetsPage() {
  const classes = DefaultPresetsPageStyles();
  const navigate = useNavigate();
  const [defaultPresetData, setDefaultPresetData] = useState<Preset>(
    initialPresetGenerator(LaunchPadScale.DEFAULT)
  );
  const [sampleSoundMap, setSampleSoundMap] = useState(new Map());
  const dispatch = useDispatch();
  const state = useAppSelector((state) => state.getPresetSlice);
  const urlParams = useParams<{ userId: string; presetId: string }>();

  const { presetList, isLoading } = useAppSelector(
    (state) => state.getMyPresetListSlice
  );

  const getInitialPresetData = async (params: PresetParams) => {
    const config: PresetParams = {
      userId: params.userId || urlParams.userId,
      presetId: params.presetId || urlParams.presetId,
    };
    try {
      const nowPresetData: Preset = await getDefaultPreset(config);

      dispatch(getPresetActions.getPresetDataFulfilled(nowPresetData));
      setPresetData({
        nowPresetData,
        defaultPresetData: initialPresetGenerator(LaunchPadScale.DEFAULT),
        setDefaultPresetData: setDefaultPresetData,
      });

      dispatch(
        soundButtonsActions.setButtonState({
          soundSamples: nowPresetData.soundSamples,
        })
      );

      const currentSampleSoundMap = sampleSoundMap;
      nowPresetData.soundSamples.map((soundSample) => {
        currentSampleSoundMap.set(
          soundSample.location,
          soundSample.soundSampleURL
        );
      });
      setSampleSoundMap(currentSampleSoundMap);
    } catch (err) {
      alertSnackBarMessage({
        message: `프리셋이 없거나, 가져오지 못했습니다.`,
        type: SnackBarMessageType.ERROR,
      });
      dispatch(getPresetActions.getPresetDataRejected());
      navigate("/");
    }
  };

  const selectedListDataState = useAppSelector(
    (state) => state.getPresetDataFromListSlice
  );

  useEffect(() => {
    // getPresetListInfoData();
    const params: PresetParams = {
      userId: selectedListDataState.userId,
      presetId: selectedListDataState.presetId,
    };
    getInitialPresetData(params);
  }, [selectedListDataState]);

  return (
    <div className={classes.root}>
      <div className={classes.container}>
        <div className={classes.launchPad}>
          <LaunchpadHeaderContainer
            title={defaultPresetData.presetTitle}
            onlyFork={true}
            presetId={defaultPresetData.presetId || "unknownId"}
          />
          {state.isLoading ? (
            "로딩중"
          ) : (
            <LaunchPad
              presetData={defaultPresetData}
              sampleSoundMap={sampleSoundMap}
            />
          )}
        </div>
        <div className={classes.togglePresetBtn}>
          <PresetToggleButton type={ToggleType.default} />
        </div>
        <div className={classes.presetList}>
          <div className="presetListContainer">
            <PresetImage imageURL={selectedListDataState.thumbnailURL} />
            <PresetList createBtn={false} type={"defaultpresets"} />
          </div>
        </div>
        <div className={classes.community}></div>
      </div>
    </div>
  );
}

export default DefaultPresetsPage;
