import React, { useState, useEffect, useContext, useRef } from "react";
import { Space, Table, Card, Row, Col, Typography } from "antd";
import { iPagination, isortOrderArray } from "../../../../Shared/Pagination";
import "simplebar/dist/simplebar.min.css";
import {
  formatBoolean,
  formatDate,
  nullDataCheck,
  showNotification,
} from "../../../../Shared/Common";
import {
  BREADCRUMB_MAIN_MODULE_NAME,
  CUSTOM_REPORTS_ENUM,
  ENUM_NOTIFY_TYPE,
  EXCEL_REPORTS_ENUM,
  FUNCTIONALITY,
  NOTIFICATION_TITLE,
} from "../../../../Common/utility/globalenums";
import OpportunityService from "../../../../Services/Reports/Core/opportunity.service";
import ENUM_HTTPSTATUSCODE from "../../../../Common/utility/httpstatuscode.enum";
import BreadcrumbHOC from "../../../Common/HOC/breadcrumbHOC.component";

import CustomBreadCrumb from "../../../Common/Breadcrumb/breadcrumb.component";
import ExportExcel from "../../../Common/GridAttributeHocUI/exportexcel.component";

import AddFilterButton from "../../../Common/GridAttributeHocUI/AddFilter/addfilter.component";
import ManageColumns from "../../../Common/GridAttributeHocUI/managecolumns.component";
import GridView from "../../../Common/GridAttributeHocUI/gridview.component";
import FilterCountButton from "../../../Common/GridAttributeHocUI/AddFilter/filtercountbutton.component";
import CoreReportService from "../../../../Services/Reports/Core/corereport.service";
import CustomReport from "../../../Common/GridAttributeHocUI/customreport.component";
import { usePromiseTracker } from "react-promise-tracker";
import { AuthContext } from "../../../../AppState";
import Member360Service from "../../../../Services/Member360/member360.service";
import MemberDrawer from "../../../Member/MemberOverview/member.drawer";

const { Title, Link } = Typography;

function Opportunity(props) {
  const {
    setColumnsToHOC,
    isColVisible,
    gridview,
    setValuesToHoc,
    setAllFiltersAndDownloadxlsToHoc,
    _filterData,
    layout,
    setLayout,
    pageTitle,
    setGridView,
    loadLayout,
    isSearchClick,
    setIsSearchClick,
    setVisibleDownload,
    searchFilterClick,
    setSearchFilterClick,
  } = props;

  const [opportunityService] = useState(() => new OpportunityService());
  const [memberCommonService] = useState(() => new Member360Service());
  const [coreReportService] = useState(() => new CoreReportService());
  const [pagination, setPagination] = useState(iPagination);
  const [sorting, setSorting] = useState({
    ...isortOrderArray,
    sortOrder: "ASC",
    sortColumn: "memberId",
  });
  let [sortedInfo, setSortedInfo] = useState(null);
  let authoizedReports = JSON.parse(sessionStorage.getItem("standardReport"));
  const [memberID, setmemberID] = useState("");
  const [visible, setVisible] = useState(false);
  const [opportunityLoading, setOpportunityLoading] = useState(false);
  const { setMemberIDState, setCurrentDosyearState, clearMemberIDState } =
    useContext(AuthContext);
  const currentYear = new Date().getFullYear().toString();
  const componentREf = useRef(null);
  let addfilterOptionData = [
    {
      key: "Year",
      filterName: "Service Year",
      type: "SingleSelectionDropdown",
      defaultValue: localStorage.requestParams
        ? JSON.parse(localStorage.requestParams).ServiceYear
        : currentYear,
      defaultDisplayValue: localStorage.requestParams
        ? JSON.parse(localStorage.requestParams).ServiceYear
        : currentYear,
      ServiceMethod: "getDOSYears",
      ServiceName: coreReportService,
      title: "DOSYear",
      value: "DOSYear",
      isRequired: true,
    },
    {
      key: "LOB",
      filterName: "LOB",
      type: "SingleSelectionDropdown",
      defaultValue: localStorage.requestParams
        ? JSON.parse(localStorage.requestParams).LOB
        : "34",
      defaultDisplayValue: localStorage.requestParams ? "" : "MA",
      ServiceMethod: "getLOB",
      ServiceName: coreReportService,
      cascadeField: ["Year"],
      title: "LOB",
      value: "LOBRCVID",
      isRequired: true,
    },
    {
      key: "CoverageID",
      filterName: "Coverage",
      type: "MultipleSelectionDropdown",
      defaultValue: localStorage.requestParams
        ? [JSON.parse(localStorage.requestParams).Coverage]
        : ["470", "471"],
      defaultDisplayValue: localStorage.requestParams ? "" : "ALL",
      ServiceMethod: "getCoverage",
      ServiceName: coreReportService,
      cascadeField: ["Year", "LOB"],
      requestParams: { Year: "DOSYear", LOB: "LOB" },
      title: "CoverageName",
      value: "CoverageID",
      isRequired: true,
    },
    {
      key: "HCC",
      filterName: "HCC",
      type: "MultipleSelectionDropdown",
      defaultValue: localStorage.requestParams
        ? JSON.parse(localStorage.requestParams).HCC
        : ["ALL"],
      defaultDisplayValue: localStorage.requestParams ? "" : "ALL",
      ServiceMethod: "getHCC",
      ServiceName: coreReportService,
      cascadeField: ["Year", "LOB", "CoverageID"],
      requestParams: {
        Year: "PaymentYear",
        LOB: "LOBID",
        CoverageID: "CoverageID",
      },
      title: "HCCText",
      value: "HCCValue",
      isRequired: true,
    },
    {
      key: "Opportunity",
      filterName: "Opportunity Status",
      type: "MultipleSelectionDropdown",
      defaultValue: localStorage.requestParams
        ? JSON.parse(localStorage.requestParams).OpportunityStatus
        : ["ALL"],
      defaultDisplayValue: localStorage.requestParams ? "" : "ALL",
      ServiceMethod: "getOpportunity",
      ServiceName: coreReportService,
      title: "OpportunityStatusName",
      value: "OpportunityStatusID",
      isRequired: true,
    },
    {
      key: "Confidence",
      filterName: "Confidence",
      type: "MultipleSelectionDropdown",
      defaultValue: localStorage.requestParams
        ? JSON.parse(localStorage.requestParams).Confidence
        : ["ALL"],
      defaultDisplayValue: localStorage.requestParams ? "" : "ALL",
      ServiceMethod: "getConfidence",
      ServiceName: coreReportService,
      title: "ConfidenceLevelName",
      value: "ConfidenceLevelID",
      isRequired: true,
    },

    {
      key: "HIOSID",
      filterName: "HIOS ID",
      type: "SearchBox",
      defaultValue: "",
      defaultDisplayValue: "",
      isRequired: false,
    },
    {
      key: "MemberID",
      filterName: "Member ID",
      type: "SearchBox",
      defaultValue: "",
      defaultDisplayValue: "",
      isRequired: false,
    },
  ];
  const [listState, setListState] = useState({
    opportunityDataList: [],
    totalRecords: 0,
    addFilterOption: addfilterOptionData,
    encrpytedValue: "",
  });
  const { promiseInProgress } = usePromiseTracker();

  useEffect(() => {
    if (layout.layoutID > -1) {
      bindColumnsToHOC();
      bindPropertiesToHOC();
    }
  }, [layout.layoutID]);

  // useEffect(() => {
  //   //add && listParams.pID == "" in condition
  // }, [idParams]); //listParams.pID add later

  useEffect(() => {
    getDosYear();
  }, []);

  const getDosYear = () => {
    memberCommonService.getCurrentDOSYears().then((response) => {
      let _dosYear = response;
      setCurrentDosyearState(_dosYear);
    });
  };

  useEffect(() => {
    resetHorizontal();
  }, [_filterData, pagination]);

  //Use : to reset Horizontal Scroll Bar when we change in filter and pagination
  const resetHorizontal = () => {
    if (listState.opportunityDataList.length !== 0) {
      if (
        componentREf.current.childNodes[0].getElementsByClassName(
          "ant-table-body"
        )[0] !== undefined
      ) {
        componentREf.current.childNodes[0].getElementsByClassName(
          "ant-table-body"
        )[0].scrollLeft = 0;
        componentREf.current.childNodes[0].getElementsByClassName(
          "ant-table-body"
        )[0].scrollTop = 0;
      }
    }
  };

  //Use : bind all columns to ManageColumns ,bind filter and xls properties
  const bindColumnsToHOC = () => {
    let _columns = getColumns();
    if (layout?.layoutID > 0) {
      let customLayout = loadLayout(
        _columns,
        addfilterOptionData,
        pagination,
        layout
      );

      setColumnsToHOC(customLayout.customGridColumns);
      setSorting(customLayout.customSorter);
      setPagination(customLayout.customPagination);
      setGridView(customLayout.customGridView);
      addfilterOptionData = customLayout.customFilterData;
    } else setColumnsToHOC(_columns);

    let excelParams = {
      reportID: EXCEL_REPORTS_ENUM.OPPORTUNITY_REPORT_ID,
      layoutID: layout?.layoutID,
      tabName:
        layout?.layoutID > 0
          ? layout.layoutName
          : EXCEL_REPORTS_ENUM.OPPORTUNITY_REPORT_NAME,
    };
    // filter obj and excel parameter
    setAllFiltersAndDownloadxlsToHoc(
      addfilterOptionData,
      excelParams,
      NOTIFICATION_TITLE.OPPORTUNITY,
      undefined
    );
  };

  //Use : bind all properties to breadcrumb
  const bindPropertiesToHOC = () => {
    setValuesToHoc(
      FUNCTIONALITY.CORE_REPORT_KEY.BACK,
      BREADCRUMB_MAIN_MODULE_NAME.CORE_REPORT,
      CUSTOM_REPORTS_ENUM.OPPORTUNITY_REPORT_ID
    );
  };

  useEffect(() => {
    if (_filterData) {
      if (!isSearchClick) getOpportunityList(_filterData);
      else {
        let SortInfo = {};
        let pageInfo = {};
        if (layout?.layout !== undefined && layout?.layout !== null) {
          SortInfo = {
            sortColumn: layout?.layout?.sortColumn,
            sortOrder:
              layout?.layout?.sortOrder === "ASC"
                ? "ASC"
                : layout?.layout?.sortOrder === "DESC"
                ? "DESC"
                : null,
          };
          pageInfo = {
            ...pagination,
            current: layout?.layout?.pagination.current ?? iPagination.current,
            pageSize:
              layout?.layout?.pagination.pageSize ?? iPagination.pageSize,
          };
        } else {
          SortInfo = {
            ...isortOrderArray,
            sortOrder: "ASC",
            sortColumn: "memberId",
          };
          pageInfo = {
            ...pagination,
            current: iPagination.current,
            pageSize: iPagination.pageSize,
          };
        }
        setSorting(SortInfo);
        setSortedInfo(null);
        setPagination(pageInfo);
        setIsSearchClick(false);
      }
    }
  }, [pagination, sortedInfo, _filterData]);

  const getOpportunityList = (filterdata) => {
    const hcc = filterdata.HCC_ValueCount.split("/");
    const opportunity = filterdata.Opportunity_ValueCount.split("/");
    const coverage = filterdata.CoverageID_ValueCount.split("/");
    const confidence = _filterData.Confidence_ValueCount.split("/");
    let params = {
      pagination: pagination,
      sortOrder: sorting,
      filters: "",
      recordStatus: filterdata.RecordStatus,
      ServiceYear: parseInt(filterdata.Year),
      LOB: parseInt(filterdata.LOB),
      Coverage:
        coverage?.length === 2 && coverage[0] === coverage[1]
          ? ""
          : filterdata.CoverageID,
      OpportunityStatus:
        opportunity?.length === 2 && opportunity[0] === opportunity[1]
          ? ""
          : filterdata.Opportunity,

      Confidence:
        confidence?.length === 2 && confidence[0] === confidence[1]
          ? ""
          : _filterData.Confidence,

      HCC: hcc?.length === 2 && hcc[0] === hcc[1] ? "" : filterdata.HCC,
      HIOSID: filterdata.HIOSID ? filterdata.HIOSID.trim() : "",
      MemberID: filterdata.MemberID ? filterdata.MemberID.trim() : "",
      isExport: false,
      SearchClick: searchFilterClick,
      isLayoutReport: layout?.layoutID > 0,
    };
    pagination.total = listState.totalRecords;
    opportunityService.getOpportunityCoreReportData(params).then((response) => {
      setOpportunityLoading(true);
      localStorage.removeItem("requestParams");
      if (nullDataCheck(response, NOTIFICATION_TITLE.OPPORTUNITY)) return;
      if (response.statusCode === ENUM_HTTPSTATUSCODE.OK) {
        setVisibleDownload(false);
        if (response.data.length === 0) {
          setVisibleDownload(true);
          showNotification(
            ENUM_NOTIFY_TYPE.INFO,
            layout.layoutName,
            response.message
          );
        }
        setListState((prevState) => ({
          ...prevState,
          opportunityDataList: response.data,
          totalRecords: response.totalRecords,
        }));
        setSearchFilterClick(false);
      }
    });
  };

  //Get All colmuns
  const getColumns = () => {
    let customSortInfo = {};
    if (layout?.layout !== undefined && layout?.layout !== null) {
      customSortInfo = {
        columnKey: layout?.layout?.sortColumn,
        order:
          layout?.layout?.sortOrder === "ASC"
            ? "ascend"
            : layout?.layout?.sortOrder === "DESC"
            ? "descend"
            : null,
      };
      if (
        customSortInfo.columnKey === "memberId" &&
        customSortInfo.order === "ascend"
      )
        customSortInfo.order = null;
    }
    sortedInfo = sortedInfo || customSortInfo;
    const columns = [
      {
        title: "Member ID",
        dataIndex: "memberId",
        key: "memberId",
        width: 170,
        className: "color-green-td",
        ellipsis: { showTitle: true },
        render: (text, record) => (
          <Link title={text} onClick={() => showDrawer(text)}>
            {text}
          </Link>
        ),
        // render: (text, record) => (
        //   <Button
        //     type="text"
        //     className="p-0"
        //     size="small"
        //     variant="themelink"
        //     title={text}
        //     onClick={() => encryptIDAndRedirect(text)}
        //   >
        //     {" "}
        //     {text}
        //   </Button>
        // ),
        hidden: isColVisible("memberId"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder: sortedInfo?.columnKey === "memberId" && sortedInfo?.order,
        sortDirections: ["descend", "ascend", "descend"],
      },
      {
        title: "Benefit Year",
        dataIndex: "benefitYear",
        key: "benefitYear",
        width: 150,
        ellipsis: { showTitle: true },
        hidden: isColVisible("benefitYear"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder: sortedInfo?.columnKey === "benefitYear" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
        align: "center",
      },
      {
        title: "Service Year",
        dataIndex: "serviceYear",
        key: "serviceYear",
        width: 150,
        ellipsis: { showTitle: true },
        hidden: isColVisible("serviceYear"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder: sortedInfo?.columnKey === "serviceYear" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
        align: "center",
      },
      {
        title: "HIOS ID",
        dataIndex: "hoisID",
        key: "hoisID",
        width: 120,
        hidden: isColVisible("hoisID"),
        ellipsis: { showTitle: true },
        showSorterTooltip: false,
        sorter: true,
        sortOrder: sortedInfo?.columnKey === "hoisID" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "HCC",
        dataIndex: "hccText",
        key: "hccText",
        width: 150,
        hidden: isColVisible("hccText"),
        ellipsis: { showTitle: true },
        showSorterTooltip: false,
        sorter: true,
        sortOrder: sortedInfo?.columnKey === "hccText" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "Condition Description",
        dataIndex: "conditionDescription",
        key: "conditionDescription",
        width: 250,
        ellipsis: { showTitle: true },
        hidden: isColVisible("conditionDescription"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "conditionDescription" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "Condition Type",
        dataIndex: "conditionType",
        key: "conditionType",
        width: 150,
        ellipsis: { showTitle: true },
        hidden: isColVisible("conditionType"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "conditionType" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "Model Description",
        dataIndex: "modelDescription",
        key: "modelDescription",
        width: 160,
        ellipsis: { showTitle: true },
        hidden: isColVisible("modelDescription"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "modelDescription" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "LOB",
        dataIndex: "lob",
        key: "lob",
        width: 100,
        ellipsis: { showTitle: true },
        hidden: isColVisible("lob"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder: sortedInfo?.columnKey === "lob" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 150,
        hidden: isColVisible("status"),
        ellipsis: { showTitle: true },
        showSorterTooltip: false,
        sorter: true,
        sortOrder: sortedInfo?.columnKey === "status" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "Confidence Level",
        dataIndex: "closureLikelihoodCategory",
        key: "closureLikelihoodCategory",
        width: 150,
        ellipsis: { showTitle: true },
        hidden: isColVisible("closureLikelihoodCategory"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "closureLikelihoodCategory" &&
          sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "HCC Coefficient",
        dataIndex: "riskScore",
        key: "riskScore",
        width: 150,
        ellipsis: { showTitle: true },
        hidden: isColVisible("riskScore"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder: sortedInfo?.columnKey === "riskScore" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
        align: "center",
      },
      {
        title: "Adjusted Coefficient",
        dataIndex: "expectedRiskScore",
        key: "expectedRiskScore",
        width: 180,
        ellipsis: { showTitle: true },
        hidden: isColVisible("expectedRiskScore"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "expectedRiskScore" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
        align: "center",
      },
      {
        title: "Specialty Visit",
        dataIndex: "hasSpecialtyVisit",
        key: "hasSpecialtyVisit",
        width: 200,
        ellipsis: { showTitle: true },
        hidden: isColVisible("hasSpecialtyVisit"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "hasSpecialtyVisit" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
        render: (text) => <div>{formatBoolean(text)}</div>,
      },
      {
        title: "Specialty Visit Provider ID",
        dataIndex: "specialtyVisitProviderID",
        key: "specialtyVisitProviderID",
        width: 200,
        ellipsis: { showTitle: true },
        hidden: isColVisible("specialtyVisitProviderID"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "specialtyVisitProviderID" &&
          sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "Specialty Visit DOS",
        dataIndex: "specialtyVisitDOS",
        key: "specialtyVisitDOS",
        width: 200,
        ellipsis: { showTitle: true },
        hidden: isColVisible("specialtyVisitDOS"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "specialtyVisitDOS" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
        render: (text) => <div>{text ? formatDate(text, true) : null}</div>,
      },
      {
        title: "Specialty Visit Description",
        dataIndex: "specialtyVisitDescription",
        key: "specialtyVisitDescription",
        width: 210,
        ellipsis: { showTitle: true },
        hidden: isColVisible("specialtyVisitDescription"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "specialtyVisitDescription" &&
          sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "Primary Care Visit",
        dataIndex: "hasPrimaryCareVisit",
        key: "hasPrimaryCareVisit",
        width: 160,
        ellipsis: { showTitle: true },
        hidden: isColVisible("hasPrimaryCareVisit"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "hasPrimaryCareVisit" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
        render: (text) => <div>{formatBoolean(text)}</div>,
      },
      {
        title: "Primary Care Provider ID",
        dataIndex: "primaryCareProviderID",
        key: "primaryCareProviderID",
        width: 200,
        ellipsis: { showTitle: true },
        hidden: isColVisible("primaryCareProviderID"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "primaryCareProviderID" &&
          sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "Primary Care DOS",
        dataIndex: "primaryCareDOS",
        key: "primaryCareDOS",
        width: 160,
        ellipsis: { showTitle: true },
        hidden: isColVisible("primaryCareDOS"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "primaryCareDOS" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
        render: (text) => <div>{text ? formatDate(text, true) : null}</div>,
      },
      {
        title: "Initial Close Date",
        dataIndex: "initialCloseDate",
        key: "initialCloseDate",
        width: 160,
        ellipsis: { showTitle: true },
        hidden: isColVisible("initialCloseDate"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "initialCloseDate" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
        render: (text) => <div>{text ? formatDate(text, true) : null}</div>,
      },
      {
        title: "Initial Close Source",
        dataIndex: "initialCloseSource",
        key: "initialCloseSource",
        width: 190,
        ellipsis: { showTitle: true },
        hidden: isColVisible("initialCloseSource"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "initialCloseSource" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "Secondary Close Date",
        dataIndex: "secondaryCloseDate",
        key: "secondaryCloseDate",
        width: 180,
        ellipsis: { showTitle: true },
        hidden: isColVisible("secondaryCloseDate"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "secondaryCloseDate" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
        render: (text) => <div>{text ? formatDate(text, true) : null}</div>,
      },
      {
        title: "Secondary Close Source",
        dataIndex: "secondaryCloseSource",
        key: "secondaryCloseSource",
        width: 200,
        ellipsis: { showTitle: true },
        hidden: isColVisible("secondaryCloseSource"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "secondaryCloseSource" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "Project Credit",
        dataIndex: "projectCredit",
        key: "projectCredit",
        width: 190,
        ellipsis: { showTitle: true },
        hidden: isColVisible("projectCredit"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "projectCredit" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "Captured In PHA Ind",
        dataIndex: "capturedInPHAInd",
        key: "capturedInPHAInd",
        render: (text) => <div>{formatBoolean(text)}</div>,
        width: 180,
        ellipsis: { showTitle: true },
        hidden: isColVisible("capturedInPHAInd"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "capturedInPHAInd" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "PHA Visit Date",
        dataIndex: "pHAVisitDate",
        key: "pHAVisitDate",
        render: (text) => <div>{text ? formatDate(text, true) : null}</div>,
        width: 150,
        ellipsis: { showTitle: true },
        hidden: isColVisible("pHAVisitDate"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "pHAVisitDate" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "Captured in MRR Ind",
        dataIndex: "capturedInMRRInd",
        key: "capturedInMRRInd",
        render: (text) => <div>{formatBoolean(text)}</div>,
        width: 180,
        ellipsis: { showTitle: true },
        hidden: isColVisible("capturedInMRRInd"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "capturedInMRRInd" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "MRR Capture Date",
        dataIndex: "mrrCaptureDate",
        key: "mrrCaptureDate",
        width: 180,
        ellipsis: { showTitle: true },
        hidden: isColVisible("mrrCaptureDate"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "mrrCaptureDate" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
        render: (text) => <div>{text ? formatDate(text, true) : null}</div>,
      },
      {
        title: "Captured in Project",
        dataIndex: "capturedInProject",
        key: "capturedInProject",
        width: 180,
        ellipsis: { showTitle: true },
        hidden: isColVisible("capturedInProject"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "capturedInProject" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
        render: (text) => <div>{formatBoolean(text)}</div>,
      },
      {
        title: "Source",
        dataIndex: "inferencingSourceDescription",
        key: "inferencingSourceDescription",
        width: 160,
        ellipsis: { showTitle: true },
        hidden: isColVisible("inferencingSourceDescription"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "inferencingSourceDescription" &&
          sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "YOY Gap Ind",
        dataIndex: "yoyGapInd",
        key: "yoyGapInd",
        render: (text) => <div>{formatBoolean(text)}</div>,
        width: 130,
        ellipsis: { showTitle: true },
        hidden: isColVisible("yoyGapInd"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder: sortedInfo?.columnKey === "yoyGapInd" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "Pharmacy Indicated Gap Ind",
        dataIndex: "pharmacyIndicatedGapInd",
        key: "pharmacyIndicatedGapInd",
        render: (text) => <div>{formatBoolean(text)}</div>,
        width: 220,
        ellipsis: { showTitle: true },
        hidden: isColVisible("pharmacyIndicatedGapInd"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "pharmacyIndicatedGapInd" &&
          sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "Lab Indicated Gap Ind",
        dataIndex: "labIndicatedGapInd",
        key: "labIndicatedGapInd",
        render: (text) => <div>{formatBoolean(text)}</div>,
        width: 200,
        ellipsis: { showTitle: true },
        hidden: isColVisible("labIndicatedGapInd"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "labIndicatedGapInd" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "Related Diagnosis Gap Ind",
        dataIndex: "relatedDiagnosIsGapInd",
        key: "relatedDiagnosIsGapInd",
        render: (text) => <div>{formatBoolean(text)}</div>,
        width: 200,
        ellipsis: { showTitle: true },
        hidden: isColVisible("relatedDiagnosIsGapInd"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "relatedDiagnosIsGapInd" &&
          sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "Inferencing Category Group",
        dataIndex: "inferencingCategoryGroup",
        key: "inferencingCategoryGroup",
        width: 230,
        ellipsis: { showTitle: true },
        hidden: isColVisible("inferencingCategoryGroup"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "inferencingCategoryGroup" &&
          sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "MRR ProjectID Ind",
        dataIndex: "activeMRRProjectID",
        key: "activeMRRProjectID",
        render: (text) => <div>{formatBoolean(text)}</div>,
        width: 170,
        ellipsis: { showTitle: true },
        hidden: isColVisible("activeMRRProjectID"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "activeMRRProjectID" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "MRR Project Name",
        dataIndex: "activeMRRProjectName",
        key: "activeMRRProjectName",
        width: 200,
        ellipsis: { showTitle: true },
        hidden: isColVisible("activeMRRProjectName"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "activeMRRProjectName" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "PHA ProjectID Ind",
        dataIndex: "activePHAProjectID",
        key: "activePHAProjectID",
        render: (text) => <div>{formatBoolean(text)}</div>,
        width: 160,
        ellipsis: { showTitle: true },
        hidden: isColVisible("activePHAProjectID"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "activePHAProjectID" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
      {
        title: "PHA Project Name",
        dataIndex: "activePHAProjectName",
        key: "activePHAProjectName",
        width: 160,
        ellipsis: { showTitle: true },
        hidden: isColVisible("activePHAProjectName"),
        showSorterTooltip: false,
        sorter: true,
        sortOrder:
          sortedInfo?.columnKey === "activePHAProjectName" && sortedInfo?.order,
        sortDirections: ["ascend", "descend", "ascend"],
      },
    ].filter((item) => item.hidden);
    return columns;
  };

  const tableChangeHandler = (pagination, filters, sorter, other) => {
    if (other.action === "sort") {
      const sorter1 = {
        sortColumn: ![undefined, null, ""].includes(sorter.field)
          ? sorter.field
          : "memberId",
        sortOrder: ![undefined, null, ""].includes(sorter.order)
          ? sorter.order === "ascend"
            ? "ASC"
            : "DESC"
          : "",
      };
      setSorting(sorter1);
      setSortedInfo(sorter);
    }
  };

  const showDrawer = (id) => {
    setmemberID(id);
    setMemberIDState(id);
    setVisible(true);
  };
  const onClose = () => {
    setmemberID("");
    clearMemberIDState();
    setVisible(false);
  };

  return (
    <>
      <div
        className="bg-white p-3 shadow-sm justify-content-between align-items-center"
        style={{ display: "flex" }}
      >
        {layout.layoutID === 0 ? (
          <CustomBreadCrumb {...props} authorizedKeys={authoizedReports} />
        ) : (
          <div />
        )}
        <div>
          <CustomReport
            {...props}
            sorting={sorting}
            notificationTitle={layout.layoutName}
            layout={layout}
            parentReportID={CUSTOM_REPORTS_ENUM.OPPORTUNITY_REPORT_ID}
            setLayout={setLayout}
            pageTitle={pageTitle}
            pagination={pagination}
          />
          <ExportExcel {...props} sorting={sorting} />
        </div>
      </div>

      <section className="m-3">
        <Row gutter={8} className="mb-xl-0 mb-lg-3 mb-md-3 mb-sm-3">
          <Col sm={24} md={24} lg={24} xl={20}>
            <AddFilterButton {...props} />
          </Col>
          <Col
            sm={24}
            md={6}
            lg={6}
            xl={4}
            className="text-xl-right text-lg-left text-md-left text-sm-left"
          >
            <Space direction="horizontal">
              <ManageColumns {...props} />
              <span
                className="mt-1"
                style={{
                  display: "block",
                  color: "#e0e1e3",
                }}
              >
                {" "}
                |{" "}
              </span>
              <GridView {...props} />
              <span
                className="mt-1"
                style={{
                  display: "block",
                  color: "#e0e1e3",
                }}
              >
                {" "}
                |{" "}
              </span>
              <FilterCountButton {...props} />
            </Space>
          </Col>
        </Row>

        <Card
          className="box-shadow card-border"
          bodyStyle={{ padding: "0" }}
          size="small"
          title={
            <Title level={5} className="text-center mb-0">
              {layout.layoutName}
            </Title>
          }
        >
          {(layout === undefined ||
            layout?.layoutID === undefined ||
            layout?.layoutID > -1) &&
          opportunityLoading ? (
            <Table
              key="opprtunity_table"
              rowKey="Opportunity_GUID"
              locale={{ emptyText: promiseInProgress ? " " : "" }}
              dataSource={listState.opportunityDataList}
              columns={getColumns()}
              scroll={{ x: 1250, y: 410 }}
              ref={componentREf}
              className={
                gridview === "Condensed"
                  ? "condensed"
                  : gridview === "Relaxed"
                  ? "relax"
                  : ""
              }
              onChange={tableChangeHandler}
              pagination={{
                ...pagination,
                total: listState.totalRecords,
                onChange: async (page, pageSize) => {
                  let pageNumber =
                    pagination?.pageSize != undefined &&
                    pagination?.pageSize !== pageSize
                      ? 1
                      : page;

                  setPagination({
                    ...pagination,
                    current: pageNumber,
                    pageSize: pageSize,
                  });
                },
              }}
            />
          ) : (
            ""
          )}
        </Card>
        {memberID ? (
          <MemberDrawer
            memberID={memberID}
            visible={visible}
            onClose={onClose}
          />
        ) : null}
      </section>
    </>
  );
}
export default BreadcrumbHOC(Opportunity);
