export const VALID_HIKVISION_COUNTING_REPORT = `
<CountingStatisticsResult xmlns="http://www.hikvision.com/ver20/XMLSchema">
  <responseStatusStrg>OK</responseStatusStrg>
  <numOfMatches>1</numOfMatches>
  <matchList>
    <matchElement>
      <startTime>2026-09-03T03:00:00Z</startTime>
      <endTime>2026-09-03T04:00:00Z</endTime>
      <enterCount>15</enterCount>
      <exitCount>11</exitCount>
    </matchElement>
  </matchList>
</CountingStatisticsResult>`;

export const EMPTY_HIKVISION_COUNTING_REPORT = `
<CountingStatisticsResult>
  <responseStatusStrg>NO MATCHES</responseStatusStrg>
  <numOfMatches>0</numOfMatches>
</CountingStatisticsResult>`;